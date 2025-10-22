import { useDropdown } from '../../../hooks/useAdvancedDropdown'
import { APIResponse } from '../NotificationsDropdown'

export const useNotificationDropdown = (data: APIResponse | undefined) => {
  const dropdownLength = data ? data.results.length + 1 : 0

  return useDropdown(dropdownLength, undefined, {
    placement: 'bottom-end',
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, 8],
        },
      },
    ],
  })
}
