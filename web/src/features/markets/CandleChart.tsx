import {
  CandlestickSeries,
  ColorType,
  createChart,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { formatDateTimeIST, formatNumber } from '@/lib/format'
import type { Candle, CandleInterval, Quote } from './api'
import { applyQuote } from './candles'

const IST = 'Asia/Kolkata'
const istTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const istDay = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: '2-digit', month: 'short' })
const istYear = new Intl.DateTimeFormat('en-IN', { timeZone: IST, year: 'numeric' })

const toDate = (time: Time) => new Date((time as number) * 1000)

// The chart draws on a canvas, so it can't use Tailwind classes: read the theme's CSS variables.
function themeColors() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    text: v('--muted'),
    border: v('--border'),
    surface: v('--surface'),
    up: v('--up'),
    down: v('--down'),
  }
}

function applyTheme(chart: IChartApi, series: ISeriesApi<'Candlestick'>) {
  const c = themeColors()
  chart.applyOptions({
    layout: { background: { type: ColorType.Solid, color: c.surface }, textColor: c.text },
    grid: { vertLines: { color: c.border }, horzLines: { color: c.border } },
    rightPriceScale: { borderColor: c.border },
    timeScale: { borderColor: c.border },
  })
  series.applyOptions({
    upColor: c.up,
    downColor: c.down,
    borderUpColor: c.up,
    borderDownColor: c.down,
    wickUpColor: c.up,
    wickDownColor: c.down,
  })
}

/**
 * Candlestick chart. lightweight-charts is an imperative library (like a jQuery plugin), so the
 * component owns it through refs: create it once, feed it data in effects, destroy it on unmount.
 * Each effect's returned function is its cleanup, React's ngOnDestroy for that one concern.
 */
export function CandleChart({
  candles,
  quote,
  interval,
  label,
}: {
  candles: Candle[]
  quote: Quote | null | undefined
  interval: CandleInterval
  label: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lastRef = useRef<Candle | undefined>(undefined)

  // Create the chart once; remove it (and its canvas, listeners, ResizeObserver) on unmount.
  useEffect(() => {
    const chart = createChart(containerRef.current!, {
      autoSize: true,
      layout: { fontFamily: getComputedStyle(document.body).fontFamily, attributionLogo: false },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time, type: TickMarkType) => {
          const date = toDate(time)
          if (type === TickMarkType.Year) return istYear.format(date)
          if (type === TickMarkType.Month || type === TickMarkType.DayOfMonth)
            return istDay.format(date)
          return istTime.format(date)
        },
      },
      localization: {
        locale: 'en-IN',
        timeFormatter: (time: Time) => formatDateTimeIST(toDate(time)),
        priceFormatter: (price: number) => formatNumber(price),
      },
    })
    const series = chart.addSeries(CandlestickSeries)
    applyTheme(chart, series)
    chartRef.current = chart
    seriesRef.current = series

    // Recolour when the theme toggle flips data-theme on <html>.
    const observer = new MutationObserver(() => applyTheme(chart, series))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // New history (first load or a different interval): replace everything.
  useEffect(() => {
    seriesRef.current?.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })))
    lastRef.current = candles.at(-1)
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  // Each new quote moves the last candle (or opens the next one).
  const price = quote?.lastPrice
  const timestamp = quote?.timestamp
  useEffect(() => {
    if (price == null || !timestamp) return
    const next = applyQuote(lastRef.current, price, timestamp, interval)
    if (!next) return
    seriesRef.current?.update({ ...next, time: next.time as UTCTimestamp })
    lastRef.current = next
  }, [price, timestamp, interval])

  return <div ref={containerRef} role="img" aria-label={label} className="h-80 w-full sm:h-96" />
}
