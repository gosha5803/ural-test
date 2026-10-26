import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { API_URL, API_KEY } from '../config'

// API на «не найдено» отвечает массивом с одной пустой позицией (goodsID из нулей)
const isEmptyGoods = (goods) => goods.length === 1 && /^[0-]*$/.test(goods[0].goodsID ?? '')

// Обычная функция: запрос + проверка ответа. Возвращает goods ([] — ничего не найдено) или бросает Error
async function fetchGoods(params) {
  const query = Object.entries({ key: API_KEY, ...params })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  let res
  try {
    res = await fetch(`${API_URL}?${query}`)
  } catch {
    throw new Error('Ошибка сети: не удалось связаться с сервером')
  }
  // Ошибки API приходят как {"error": ...}, в т.ч. с не-2xx статусом — сначала читаем тело
  let data = null
  try {
    data = await res.json()
  } catch {
    // тело не JSON — решаем ниже по статусу
  }
  if (data?.error) {
    throw new Error(Array.isArray(data.error) ? data.error.join(', ') : data.error)
  }
  if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`)
  if (!Array.isArray(data?.goods)) throw new Error('Некорректный ответ сервера')

  return isEmptyGoods(data.goods) ? [] : data.goods
}

// Брошенный Error createAsyncThunk сам кладёт в action.error.message
export const searchBrands = createAsyncThunk('parts/searchBrands', (number) =>
  fetchGoods({ number }),
)

export const fetchOffers = createAsyncThunk('parts/fetchOffers', (brand, { getState }) =>
  // info=on — API добавляет признак невозвратности notRefund
  fetchGoods({ number: getState().parts.number, brand, analogues: 'on', info: 'on' }),
)

export const STATUS = Object.freeze({
  idle: 'idle',
  loading: 'loading',
  succeeded: 'succeeded',
  failed: 'failed',
})

// requestId — уникальный id каждого dispatch (из createAsyncThunk): ответы устаревших запросов игнорируем
const initialRequest = { goods: [], status: STATUS.idle, error: null, requestId: null }

const partsSlice = createSlice({
  name: 'parts',
  initialState: {
    number: '',
    selectedBrand: null,
    search: initialRequest,
    offers: initialRequest,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(searchBrands.pending, (state, action) => {
        state.number = action.meta.arg
        state.selectedBrand = null
        state.offers = initialRequest
        // goods не сбрасываем: старые бренды остаются приглушёнными, пока ищутся новые
        state.search.status = STATUS.loading
        state.search.error = null
        state.search.requestId = action.meta.requestId
      })
      .addCase(searchBrands.fulfilled, (state, action) => {
        if (state.search.requestId !== action.meta.requestId) return
        state.search.status = STATUS.succeeded
        state.search.goods = action.payload
      })
      .addCase(searchBrands.rejected, (state, action) => {
        if (state.search.requestId !== action.meta.requestId) return
        state.search.status = STATUS.failed
        state.search.goods = []
        state.search.error = action.error.message
      })
      // goods не сбрасываем: старая таблица остаётся приглушённой, пока грузится новая
      .addCase(fetchOffers.pending, (state, action) => {
        state.selectedBrand = action.meta.arg
        state.offers.status = STATUS.loading
        state.offers.error = null
        state.offers.requestId = action.meta.requestId
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        if (state.offers.requestId !== action.meta.requestId) return
        state.offers.status = STATUS.succeeded
        state.offers.goods = action.payload
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        if (state.offers.requestId !== action.meta.requestId) return
        state.offers.status = STATUS.failed
        state.offers.goods = []
        state.offers.error = action.error.message
      })
  },
})

export const selectSearch = (state) => state.parts.search
export const selectOffers = (state) => state.parts.offers
export const selectSelectedBrand = (state) => state.parts.selectedBrand
export const selectIsSearching = (state) => state.parts.search.status === STATUS.loading

export const selectSearchGoods = (state) => state.parts.search.goods
export const selectOffersGoods = (state) => state.parts.offers.goods

// Входом берём именно goods: смена status/error не пересоздаёт массив и не дёргает зависящие от него эффекты
export const selectBrands = createSelector([selectSearchGoods], (goods) => [
  ...new Set(goods.map((g) => g.brand).filter(Boolean)),
])

// Верхний уровень goods — исходные позиции (по номеру+бренду), аналоги вложены в них
export const selectOfferAnalogues = createSelector([selectOffersGoods], (goods) =>
  goods.flatMap((g) => g.analogues ?? []),
)

export default partsSlice.reducer
