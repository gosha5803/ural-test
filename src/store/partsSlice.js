import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { API_URL, API_KEY } from '../config'

// API на «не найдено» отвечает массивом с одной пустой позицией (goodsID из нулей)
const isEmptyGoods = (goods) => goods.length === 1 && /^[0-]*$/.test(goods[0].goodsID ?? '')

// Обычная функция: запрос + проверка ответа. Возвращает goods ([] — ничего не найдено) или бросает Error.
// В message — исходный текст ошибки API или технический код, без перевода: тексты для пользователя — в селекторах
async function fetchGoods(params) {
  const query = Object.entries({ key: API_KEY, ...params })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')

  let res
  try {
    res = await fetch(`${API_URL}?${query}`)
  } catch {
    throw new Error('NETWORK_ERROR')
  }
  // Ошибки API приходят как {"error": ...}, в т.ч. с не-2xx статусом — сначала читаем тело
  let data = null
  try {
    data = await res.json()
  } catch {
    // тело не JSON — решаем ниже по статусу
  }
  if (data?.error) {
    // По документации ошибок может быть несколько; createAsyncThunk сохраняет только строку message — склеиваем через \n
    throw new Error((Array.isArray(data.error) ? data.error : [data.error]).join('\n'))
  }
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  if (!Array.isArray(data?.goods)) throw new Error('INVALID_RESPONSE')

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

// Исходная ошибка (текст API или код из fetchGoods) → текст для пользователя
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ошибка сети: не удалось связаться с сервером',
  INVALID_RESPONSE: 'Некорректный ответ сервера',
  'Empty key!': 'Не указан ключ доступа к сервису',
  'Invalid key client!': 'Неверный ключ доступа к сервису',
  'The API key provided is invalid or has been revoked': 'Ключ доступа к сервису недействителен или отозван',
  'Empty number goods!': 'Не указан артикул',
  'Request quota exceeded!': 'Превышен лимит запросов по грузовому ассортименту, попробуйте позже',
}

// Неизвестную ошибку не показываем по-английски; исходный текст остаётся в сторе (видно в Redux DevTools)
const translateError = (raw) => {
  if (ERROR_MESSAGES[raw]) return ERROR_MESSAGES[raw]
  if (raw.startsWith('HTTP_')) return `Ошибка сервера: ${raw.slice(5)}`
  return 'Сервис вернул ошибку, попробуйте позже'
}

// Несколько ошибок приходят через \n — переводим каждую и убираем повторы
const toUserMessage = (raw) => (raw ? [...new Set(raw.split('\n').map(translateError))].join('. ') : null)

export const selectSearch = (state) => state.parts.search
export const selectOffers = (state) => state.parts.offers
export const selectSelectedBrand = (state) => state.parts.selectedBrand
export const selectIsSearching = (state) => state.parts.search.status === STATUS.loading
// Строка сравнивается по значению — мемоизация не нужна
export const selectSearchError = (state) => toUserMessage(state.parts.search.error)
export const selectOffersError = (state) => toUserMessage(state.parts.offers.error)

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
