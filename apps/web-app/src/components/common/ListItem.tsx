import React, { useState } from 'react'

export type ListItemAction = 'viewing' | 'editing'

export interface ViewingComponentType<T> {
  item: T
  onEdit: () => void
}

export interface EditingComponentType<T> {
  item: T
  onUpdate: (item: T) => void
  onDelete: (item: T) => void
  onCancel: () => void
}

export interface ListItemProps<T> {
  item: T
  action: ListItemAction
  ViewingComponent: React.ComponentType<ViewingComponentType<T>>
  EditingComponent: React.ComponentType<EditingComponentType<T>>
  onEdit: () => void
  onEditCancel: () => void
  onUpdate: (item: T) => void
  onDelete: (item: T) => void
  itemRef?: React.Ref<HTMLDivElement>
}

export function ListItem<T>({
  item,
  action,
  ViewingComponent,
  EditingComponent,
  onEdit,
  onEditCancel,
  onUpdate,
  onDelete,
  itemRef,
}: ListItemProps<T>): JSX.Element {
  if (action === 'editing') {
    return (
      <div ref={itemRef}>
        <EditingComponent
          item={item}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCancel={onEditCancel}
        />
      </div>
    )
  }

  return (
    <div ref={itemRef}>
      <ViewingComponent item={item} onEdit={onEdit} />
    </div>
  )
}

export default ListItem