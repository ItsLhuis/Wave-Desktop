"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode
} from "react"

import { cn } from "@lib/utils"

/* import { Focusing, Hovering } from "../features" */

import { useTranslation } from "@i18n/hooks"

import { useScroll } from "../hooks"

import { useVirtualizer } from "@tanstack/react-virtual"

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  Table as TanStackTable,
  useReactTable,
  VisibilityState
} from "@tanstack/react-table"

import { ContextMenu, ContextMenuTrigger } from "@components/ui/ContextMenu"
import { Loader } from "@components/ui/Loader"
import { ScrollArea } from "@components/ui/ScrollArea"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/Table"

import { AnimatePresence, motion } from "motion/react"

import { type SharedScrollContainerProps } from "../types"

export type VirtualizedTableGridProps<TData, TValue> = HTMLAttributes<HTMLDivElement> &
  SharedScrollContainerProps & {
    HeaderComponent: (table: TanStackTable<TData>) => ReactNode
    StickyHeaderComponent?: (table: TanStackTable<TData>) => ReactNode
    ListHeaderComponent?: (table: TanStackTable<TData>) => ReactNode
    stickyHeaderContainerClassName?: string
    containerClassName?: string
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    estimateSize: number
    rowContextMenuContent?: (table: TanStackTable<TData>) => ReactNode
    rowGridCols?: Array<string | number>
    rowClassName?: string
    rowStyle?: CSSProperties
    showTableColumns?: boolean
    initialVisibleColumns?: VisibilityState
    isLoading?: boolean
  }

const VirtualizedTableGrid = <TData, TValue>({
  HeaderComponent,
  StickyHeaderComponent,
  ListHeaderComponent,
  stickyHeaderContainerClassName,
  stickHeaderThreshold = 10,
  containerClassName,
  columns,
  data,
  estimateSize,
  rowContextMenuContent,
  rowGridCols = [],
  rowClassName = "",
  rowStyle = {},
  showTableColumns = true,
  initialVisibleColumns = {},
  isLoading = false,
  className,
  ...props
}: VirtualizedTableGridProps<TData, TValue>) => {
  const { t } = useTranslation()

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const tableHeaderRef = useRef<HTMLTableSectionElement | null>(null)

  const [headerHeight, setHeaderHeight] = useState<number>(0)

  const { isScrolled } = useScroll({
    scrollRef,
    headerHeight
  })

  const calculateHeaderHeight = useCallback(() => {
    let totalHeight = 0
    if (headerRef.current) {
      totalHeight += headerRef.current.getBoundingClientRect().height
    }
    if (showTableColumns && tableHeaderRef.current) {
      totalHeight += tableHeaderRef.current.getBoundingClientRect().height
    }
    setHeaderHeight(totalHeight + stickHeaderThreshold)
  }, [headerRef, tableHeaderRef, showTableColumns, stickHeaderThreshold])

  useEffect(() => {
    calculateHeaderHeight()
  }, [])

  const [sorting, setSorting] = useState<SortingState>([])

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibleColumns)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    /* _features: [Focusing, Hovering], */
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: (updater) => {
      const columns = typeof updater === "function" ? updater(columnVisibility) : updater
      setColumnVisibility(columns)
    },
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    }
  })

  const { rows } = table.getRowModel()

  const estimateRowSize = useCallback(() => estimateSize, [estimateSize])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: estimateRowSize,
    getScrollElement: () => scrollRef.current,
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 10
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  const visibleColumns = useMemo(
    () => table.getAllColumns().filter((col) => col.getIsVisible()),
    [columnVisibility]
  )

  const dynamicGridCols = useMemo(() => {
    return visibleColumns
      .map((column) => {
        const columnIndex = table.getAllColumns().indexOf(column)
        return rowGridCols[columnIndex] || "1fr"
      })
      .join(" ")
  }, [visibleColumns])

  return (
    <ScrollArea ref={scrollRef} className={cn("flex-1 w-full h-full", containerClassName)}>
      <div className={cn("relative flex flex-col flex-1 w-full", isLoading && "h-full")}>
        <AnimatePresence mode="popLayout">
          {isScrolled && StickyHeaderComponent && (
            <motion.div
              className={cn(
                "flex flex-col flex-1 sticky top-0 left-0 right-0 z-50 w-full border-b border-border bg-background/60 backdrop-blur px-3 md:px-9 transition-[background-color,border-color,padding]",
                stickyHeaderContainerClassName
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {StickyHeaderComponent(table)}
              {showTableColumns && (
                <div className="w-full">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <div
                      key={headerGroup.id}
                      className={cn("grid w-full", rowClassName)}
                      style={{ gridTemplateColumns: dynamicGridCols, ...rowStyle }}
                    >
                      {headerGroup.headers.map((header) => (
                        <div
                          key={header.id}
                          className={cn(
                            "p-3 flex items-center font-medium text-muted-foreground truncate",
                            header.column.columnDef.meta?.className
                          )}
                          style={{
                            width: header.column.columnDef.meta?.width
                              ? header.column.columnDef.meta?.width
                              : "100%"
                          }}
                        >
                          <div className="text-sm truncate transition-colors">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={headerRef}>
          {HeaderComponent(table)}
          {ListHeaderComponent && ListHeaderComponent(table)}
        </div>
        <div
          className={cn("h-full p-3 md:p-9 pt-3 md:pt-3 transition-[padding]", className)}
          {...props}
        >
          <Table className={cn("relative overflow-hidden", isLoading && "h-full")}>
            {showTableColumns && (
              <TableHeader ref={tableHeaderRef}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className={cn(
                      "grid w-full hover:bg-transparent focus-within:bg-transparent mb-3",
                      rowClassName
                    )}
                    style={{ gridTemplateColumns: dynamicGridCols, ...rowStyle }}
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn("truncate", header.column.columnDef.meta?.className)}
                        style={{
                          width: header.column.columnDef.meta?.width
                            ? header.column.columnDef.meta?.width
                            : "100%"
                        }}
                      >
                        <div className="truncate transition-colors">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
            )}
            <motion.tbody
              key={String(isLoading)}
              style={{ height: isLoading ? "100%" : `${rowVirtualizer.getTotalSize()}px` }}
              className={cn(isLoading && "flex justify-center items-center h-full")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isLoading ? (
                <TableRow className="flex items-center min-h-14 hover:bg-transparent border-none">
                  <TableCell>
                    <Loader />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow className="flex w-full justify-center rounded-md hover:bg-transparent border-none">
                  <TableCell colSpan={columns.length} className="text-center py-4">
                    {t("common.noResultsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <ContextMenu key={row.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          data-state={row.getIsSelected() && "selected"}
                          className={cn(
                            "grid absolute w-full border-none rounded-md",
                            rowClassName,
                            "group"
                          )}
                          style={{
                            transform: `translateY(${virtualRow.start}px)`,
                            gridTemplateColumns: dynamicGridCols,
                            ...rowStyle
                          }}
                          /* onFocus={() => row.toggleFocused()}
                            onBlur={() => row.toggleFocused()}
                            onMouseEnter={() => row.toggleHovered()}
                            onMouseLeave={() => row.toggleHovered()} */
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn("truncate", cell.column.columnDef.meta?.className)}
                              style={{
                                width: cell.column.columnDef.meta?.width
                                  ? cell.column.columnDef.meta?.width
                                  : "100%"
                              }}
                            >
                              <div className="flex-1 truncate transition-colors">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      </ContextMenuTrigger>
                      {rowContextMenuContent?.(table)}
                    </ContextMenu>
                  )
                })
              )}
            </motion.tbody>
          </Table>
        </div>
      </div>
    </ScrollArea>
  )
}
VirtualizedTableGrid.displayName = "VirtualizedTableGrid"

export { VirtualizedTableGrid }
