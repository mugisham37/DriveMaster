import React from 'react'
import { SingleSelect } from '../../common/SingleSelect'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export type Order = 'newest_first' | 'oldest_first'

const OptionComponent = ({ option: order }: { option: Order }) => {
  const { t } = useAppTranslation('components/journey/solutions-list')
  switch (order) {
    case 'oldest_first':
      return <>{t('orderSwitcher.oldestFirst')}</>
    case 'newest_first':
      return <>{t('orderSwitcher.newestFirst')}</>
  }
}

export const OrderSwitcher = ({
  value,
  setValue,
}: {
  value: Order
  setValue: (value: Order) => void
}): React.ReactElement => {
  return (
    <SingleSelect<Order>
      options={['newest_first', 'oldest_first']}
      value={value}
      setValue={setValue}
      SelectedComponent={OptionComponent}
      OptionComponent={OptionComponent}
    />
  )
}
