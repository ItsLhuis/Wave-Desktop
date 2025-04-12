import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useTranslation } from "@i18n/hooks"

import { songKeys } from "@features/songs/api/keys"

import { createSong } from "@features/songs/api/mutations"

import { toast } from "@components/ui"

export function useCreateSong() {
  const queryClient = useQueryClient()

  const { t } = useTranslation()

  return useMutation({
    mutationFn: createSong,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: songKeys.infinite() })
    },
    onSuccess: (song) => {
      toast.success(t("songs.createdTitle"), {
        description: t("songs.createdDescription", { name: song.name })
      })
    },
    onError: (error) => {
      toast.error(t("songs.createdFailedTitle"), {
        description: error.message
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.infinite() })
    }
  })
}
