import { useState, useCallback } from 'react'
import { QueryKey } from '@tanstack/react-query'
import { ListItemAction } from './ListItem'

interface ItemWithUuid {
  uuid: string
}

export function useItemList<T extends ItemWithUuid>(cacheKey: QueryKey) {
  const [editingItems, setEditingItems] = useState<Set<string>>(new Set())

  const getItemAction = useCallback((item: T): ListItemAction => {
    return editingItems.has(item.uuid) ? 'editing' : 'viewing'
  }, [editingItems])

  const handleEdit = useCallback((item: T) => {
    return () => {
      setEditingItems(prev => new Set(prev).add(item.uuid))
    }
  }, [])

  const handleEditCancel = useCallback(() => {
    setEditingItems(new Set())
  }, [])

  const handleUpdate = useCallback((updatedItem: T) => {
    setEditingItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(updatedItem.uuid)
      return newSet
    })
    // In a real implementation, you would update the cache here
    // queryClient.setQueryData(cacheKey, ...)
  }, [])

  const handleDelete = useCallback((deletedItem: T) => {
    setEditingItems(prev => {
      const newSet = new Set(prev)
      newSet.delete(deletedItem.uuid)
      return newSet
    })
    // In a real implementation, you would update the cache here
    // queryClient.setQueryData(cacheKey, ...)
  }, [])

  return {
    getItemAction,
    handleEdit,
    handleEditCancel,
    handleUpdate,
    handleDelete,
  }
}

export default useItemList