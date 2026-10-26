import { formatPrice, formatShipment } from '../utils/format'

// Предложения складов одного товара: только с остатком, от дешёвых к дорогим.
// bestId — склад, чья цена вынесена в строку товара («от …»), отмечаем его
export default function WarehouseList({ warehouses, bestId }) {
  const offers = warehouses.filter((w) => w.stock > 0).sort((a, b) => a.price - b.price)

  return (
    <table className="table table-sm mb-0">
      <thead>
        <tr>
          <th>Склад</th>
          <th>Отгрузка</th>
          <th className="text-end">Цена</th>
          <th className="text-end">Остаток</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((w) => (
          <tr key={w.id}>
            <td>
              {w.code || '—'}
              {w.id === bestId && <span className="badge text-bg-success ms-2">Лучшая цена</span>}
              {w.notRefund && (
                <span className="badge text-bg-warning ms-2" title="Нельзя вернуть по причине «Отказ»">
                  Невозвратный
                </span>
              )}
            </td>
            <td className="text-nowrap">{formatShipment(w.shipmentDate)}</td>
            <td className="text-end text-nowrap">{formatPrice(w.price)}</td>
            <td className="text-end">{w.stock}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
