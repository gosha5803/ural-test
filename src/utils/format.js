// Один форматтер на модуль, а не новый на каждую ячейку
const priceFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })

export const formatPrice = (price) => priceFormatter.format(price)

// API отдаёт время в +03:00 — показываем по Москве, а не по часовому поясу пользователя
const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Moscow' })
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })

// shipmentDate по документации: дата — день отгрузки, время — до которого нужно заказать
export const formatShipment = (iso) => {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime())) return '—'
  return `${dateFormatter.format(date)}, заказ до ${timeFormatter.format(date)}`
}
