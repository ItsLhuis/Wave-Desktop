import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useTranslation } from "@i18n/hooks"

import { songKeys } from "@features/songs/api/keys"

import { deleteSong } from "@features/songs/api/mutations"

import { toast } from "@components/ui"

export function useDeleteSong() {
  const queryClient = useQueryClient()

  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id }: { id: number }) => deleteSong(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: songKeys.details(id) })
      await queryClient.cancelQueries({ queryKey: songKeys.infinite() })
    },
    onSuccess: (song) => {
      toast.success(t("songs.deletedTitle"), {
        description: t("songs.deletedDescription", { name: song.name })
      })
    },
    onError: (error) => {
      toast.error(t("songs.deletedFailedTitle"), {
        description: error.message
      })
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: songKeys.details(id) })
      queryClient.invalidateQueries({ queryKey: songKeys.infinite() })
    }
  })
}
