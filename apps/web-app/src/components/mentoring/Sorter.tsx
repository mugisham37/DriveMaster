import React, { useCallback } from 'react'
import { SortOption } from './Inbox'
import { SingleSelect } from '../common/SingleSelect'

const OptionComponent = ({ option }: { option: SortOption }) => {
  return <React.Fragment>{option.label}</React.Fragment>
}

export const Sorter = ({
  setOrder,
  setPage,
  order,
  sortOptions,
  className,
}: {
  setOrder: (order: string) => void
  setPage: (page: number) => void
  order: string
  sortOptions: readonly SortOption[]
  className?: string
}): React.JSX.Element => {
  const mutableOptions = [...sortOptions] as SortOption[]
  const value = mutableOptions.find((o) => o.value === order) || mutableOptions[0]
  const setValue = useCallback(
    (option: SortOption) => {
      setOrder(option.value)
      setPage(1)
    },
    [setOrder, setPage]
  )

  if (!value) {
    return <div>No sort options available</div>
  }

  return (
    <div className={className}>
      <SingleSelect<SortOption>
        options={mutableOptions}
        value={value}
        setValue={setValue}
        SelectedComponent={OptionComponent}
        OptionComponent={OptionComponent}
      />
    </div>
  )
}