import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, Area, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Zap, Sun, Leaf, TrendingUp, Wind, Cloud, Droplets,
  Thermometer, BarChart2, Brain, Settings, Activity,
  MapPin, Clock, Search, ChevronRight,
} from 'lucide-react'
import './index.css'

// ── Mock data ─────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

const solarP50 = [0,0,0,0,0,2,8,22,45,78,105,118,120,115,98,72,45,22,8,2,0,0,0,0]
const solarP10 = solarP50.map(v => +(v * 0.72).toFixed(1))
const solarP90 = solarP50.map(v => +(v * 1.28).toFixed(1))

const windP50  = [35,32,28,30,34,38,42,40,38,35,32,35,40,44,48,45,42,40,38,42,45,40,36,33]
const windP10  = windP50.map(v => +(v * 0.78).toFixed(1))
const windP90  = windP50.map(v => +(v * 1.22).toFixed(1))

function buildChartData(p50, p10, p90, seed) {
  return p50.map((v, i) => ({
    hour: HOURS[i],
    p50: v,
    p10: p10[i],
    p90: p90[i],
    actual: Math.max(0, +(v + (((seed + i * 7) % 17) - 8) * 0.9).toFixed(1)),
  }))
}

const shapData = [
  { feature: 'Solar Irradiation', value: 0.38 },
  { feature: 'Hour of Day',       value: 0.31 },
  { feature: 'Lag 24h',           value: 0.21 },
  { feature: 'Lag 1h',            value: 0.17 },
  { feature: 'Temperature',       value: 0.15 },
  { feature: 'Cloud Cover',       value: -0.22 },
  { feature: 'Wind Speed',        value: -0.12 },
  { feature: 'Humidity',          value: -0.08 },
]

const benchmarkData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  tft:   +(18 - i * 0.3 + Math.sin(i) * 1.2).toFixed(2),
  lstm:  +(24 - i * 0.2 + Math.sin(i * 0.8) * 2).toFixed(2),
  naive: +(32 - i * 0.1 + Math.sin(i * 0.5) * 3).toFixed(2),
}))

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200, active = true) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) { setVal(0); return }
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(+(target * ease).toFixed(target % 1 !== 0 ? 1 : 0))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, active])
  return val
}

function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

// ── Styled wrappers ───────────────────────────────────────────────────────────
const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ForecastTooltip({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null
  const accent = mode === 'solar' ? '#F5A623' : '#00D4FF'
  const map = payload.reduce((a, p) => { a[p.dataKey] = p.value; return a }, {})
  return (
    <div style={{ background: 'rgba(10,15,30,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(20px)', minWidth: 150, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      {[['P90 (upper)', map.p90], ['P50 Median', map.p50], ['P10 (lower)', map.p10]].map(([k, v], ri) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 5, opacity: ri === 1 ? 1 : 0.55 }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{k}</span>
          <span style={{ color: accent, fontFamily: 'Syne', fontWeight: 600, fontSize: 13 }}>{v ?? '--'} kW</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Actual</span>
        <span style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'Syne', fontWeight: 600, fontSize: 13 }}>{map.actual ?? '--'} kW</span>
      </div>
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, Icon, accent, delay, active, isString }) {
  const numTarget = isString ? 0 : parseFloat(value)
  const counted   = useCountUp(numTarget, 1200, active)
  const display   = isString ? value : (unit === '%' ? counted.toFixed(1) : Math.round(counted))

  return (
    <div
      className="anim-section"
      style={{ ...card, padding: '22px 24px', position: 'relative', overflow: 'hidden', animationDelay: delay }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accent} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'Syne', fontSize: 38, fontWeight: 700, letterSpacing: '-1.5px', color: '#fff', lineHeight: 1 }}>{display}</span>
        {unit && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{unit}</span>}
      </div>
    </div>
  )
}

// ── Weather hook (shared between TempCard + WeatherCard) ─────────────────────
const MOCK_WX = { temperature: 28.4, windSpeed: 14.2, cloudCover: 35, humidity: 62 }

function useWeather(city, active) {
  const [wx,        setWx]   = useState(null)
  const [loading,   setLoad] = useState(false)
  const [usingMock, setMock] = useState(false)

  useEffect(() => {
    if (!city || !active) return
    setLoad(true); setMock(false); setWx(null)
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const geoRes  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`, { signal: ctrl.signal })
        const geoData = await geoRes.json()
        if (!geoData.length) throw new Error('not found')
        const { lat, lon } = geoData[0]
        const wxRes  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,cloud_cover,relative_humidity_2m&forecast_days=1`, { signal: ctrl.signal })
        const wxData = await wxRes.json()
        setWx({ temperature: wxData.current.temperature_2m, windSpeed: wxData.current.wind_speed_10m, cloudCover: wxData.current.cloud_cover, humidity: wxData.current.relative_humidity_2m })
      } catch(e) {
        if (e.name !== 'AbortError') { setWx(MOCK_WX); setMock(true) }
      } finally { setLoad(false) }
    })()
    return () => ctrl.abort()
  }, [city, active])

  return { wx: wx || (!loading ? MOCK_WX : null), loading, usingMock }
}

// ── Temperature KPI Card ──────────────────────────────────────────────────────
function TempCard({ wx, loading, usingMock, delay }) {
  const temp = wx?.temperature != null ? (+wx.temperature).toFixed(1) : null

  return (
    <div
      className="anim-section"
      style={{ ...card, padding: '22px 24px', position: 'relative', overflow: 'hidden', animationDelay: delay, gridColumn: 'span 1' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      {/* bottom glow */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #F5A623, transparent)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Current Temp
          </span>
          {usingMock && <span style={{ fontSize: 9, color: '#F5A623', marginLeft: 6, opacity: 0.7 }}>mock</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className="live-dot" style={{ width: 6, height: 6 }} />
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Thermometer size={16} color="#F5A623" />
          </div>
        </div>
      </div>

      {loading
        ? <div className="skeleton" style={{ height: 44, width: 120, borderRadius: 8 }} />
        : <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'Syne', fontSize: 38, fontWeight: 700, letterSpacing: '-1.5px', color: '#fff', lineHeight: 1 }}>
              {temp ?? '--'}
            </span>
            <span style={{ fontSize: 18, color: '#F5A623', fontWeight: 600, fontFamily: 'Syne' }}>°C</span>
          </div>
      }

      {!loading && wx && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={9} />
          <span>Live · {wx.cloudCover > 60 ? 'Cloudy' : wx.cloudCover > 30 ? 'Partly cloudy' : 'Clear'}</span>
        </div>
      )}
    </div>
  )
}

// ── Live Weather ──────────────────────────────────────────────────────────────
function WeatherCard({ city, wx, loading, usingMock }) {
  const data = wx
  const metrics = data ? [
    { label: 'Temperature', value: (+data.temperature).toFixed(1), unit: '°C',    Icon: Thermometer, accent: '#F5A623' },
    { label: 'Wind Speed',  value: (+data.windSpeed).toFixed(1),   unit: 'km/h',  Icon: Wind,        accent: '#00D4FF' },
    { label: 'Cloud Cover', value: data.cloudCover,                unit: '%',     Icon: Cloud,       accent: 'rgba(255,255,255,0.4)' },
    { label: 'Humidity',    value: data.humidity,                  unit: '%',     Icon: Droplets,    accent: '#00D4FF' },
  ] : []

  return (
    <div
      className="anim-section anim-delay-4"
      style={{ ...card, padding: '24px', height: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 16, color: '#fff', marginBottom: 3 }}>Live Conditions</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={10} /> {city}
            {usingMock && <span style={{ color: '#F5A623', fontSize: 10 }}>· mock</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: '#00FF94', fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {loading
        ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 12 }} />)}
          </div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {metrics.map(({ label, value, unit, Icon, accent }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                  <Icon size={13} color={accent} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>{value ?? '--'}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── SHAP Panel ────────────────────────────────────────────────────────────────
function ShapPanel({ active }) {
  const maxAbs = Math.max(...shapData.map(d => Math.abs(d.value)))

  return (
    <div
      className="anim-section anim-delay-3"
      style={{ ...card, padding: '24px', height: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Brain size={16} color="#F5A623" />
          <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 16, color: '#fff' }}>Forecast Drivers</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>SHAP feature attribution</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {shapData.map((d) => {
          const pct   = Math.abs(d.value) / maxAbs * 100
          const isPos = d.value >= 0
          const color = isPos ? '#F5A623' : '#00D4FF'
          return (
            <div key={d.feature}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{d.feature}</span>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Syne', color }}>{isPos ? '+' : ''}{d.value.toFixed(2)}</span>
              </div>
              <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: active ? `${pct}%` : 0,
                  borderRadius: 6,
                  background: isPos
                    ? 'linear-gradient(90deg, #F5A623, rgba(245,166,35,0.5))'
                    : 'linear-gradient(90deg, #00D4FF, rgba(0,212,255,0.5))',
                  transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)',
                  marginLeft: isPos ? 0 : 'auto',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
        {[['#F5A623','Positive impact'],['#00D4FF','Negative impact']].map(([c, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Benchmark Panel ───────────────────────────────────────────────────────────
function BenchmarkPanel({ active }) {
  const metrics = [
    { model: 'TFT',   mae: '4.2',  rmse: '5.8',  mape: '3.1%', accent: '#F5A623', best: true },
    { model: 'LSTM',  mae: '7.1',  rmse: '9.4',  mape: '5.8%', accent: '#00D4FF', best: false },
    { model: 'Naive', mae: '14.8', rmse: '19.2', mape: '12.3%',accent: 'rgba(255,255,255,0.3)', best: false },
  ]
  return (
    <div
      className="anim-section anim-delay-5"
      style={{ ...card, padding: '24px' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Activity size={16} color="#00D4FF" />
            <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 16, color: '#fff' }}>Model Benchmark</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>TFT vs baselines · last 30 days</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['TFT','#F5A623',false],['LSTM','#00D4FF',true],['Naive','rgba(255,255,255,0.3)',true]].map(([n,c,dashed]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke={c} strokeWidth="2" strokeDasharray={dashed ? '4 2' : 'none'} /></svg>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 200, marginBottom: 28 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={benchmarkData}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} domain={[0,40]} />
            <Tooltip contentStyle={{ background: 'rgba(10,15,30,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
            <Line type="monotone" dataKey="tft"   stroke="#F5A623" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="lstm"  stroke="#00D4FF" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            <Line type="monotone" dataKey="naive" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {metrics.map(m => (
          <div key={m.model} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${m.best ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: m.accent }}>{m.model}</span>
              {m.best && <span style={{ fontSize: 9, background: 'rgba(245,166,35,0.15)', color: '#F5A623', padding: '2px 8px', borderRadius: 9999, fontWeight: 700, letterSpacing: '0.05em' }}>BEST</span>}
            </div>
            {[['MAE', m.mae, 'kW'],['RMSE', m.rmse, 'kW'],['MAPE', m.mape, '']].map(([k, v, u]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{k}</span>
                <span style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 600, color: '#fff' }}>{v}{u}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Forecast Chart ────────────────────────────────────────────────────────────
function ForecastChart({ data, mode, active }) {
  const accent = mode === 'solar' ? '#F5A623' : '#00D4FF'

  return (
    <div
      className="anim-section anim-delay-1"
      style={{ ...card, padding: '24px', marginBottom: 20 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {mode === 'solar' ? <Sun size={18} color="#F5A623" /> : <Wind size={18} color="#00D4FF" />}
            <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 18, color: '#fff' }}>24-Hour Generation Forecast</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {mode === 'solar' ? 'Solar PV · kW output' : 'Wind turbine · kW output'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.03em' }}>
          Powered by TFT + Quantile Regression
        </div>
      </div>

      <div style={{ height: 280, opacity: active ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={accent} stopOpacity={0.25} />
                <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} unit=" kW" />
            <Tooltip content={(props) => <ForecastTooltip {...props} mode={mode} />} />

            {/* P90 filled area */}
            <Area type="monotone" dataKey="p90" stroke="none" fill="url(#areaGrad)" />
            {/* P10 "erase" the bottom with background color */}
            <Area type="monotone" dataKey="p10" stroke="none" fill="#050810" />
            {/* P10 border line */}
            <Line type="monotone" dataKey="p10" stroke={`${accent}50`} strokeWidth={1} dot={false} />
            {/* P90 border line */}
            <Line type="monotone" dataKey="p90" stroke={`${accent}50`} strokeWidth={1} dot={false} />
            {/* Median P50 */}
            <Line type="monotone" dataKey="p50" stroke={accent} strokeWidth={2.5} dot={false} />
            {/* Actual dashed */}
            <Line type="monotone" dataKey="actual" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { color: accent, label: 'P50 Median', dashed: false },
          { color: `${accent}50`, label: 'P10–P90 Confidence', dashed: false },
          { color: 'rgba(255,255,255,0.55)', label: 'Actual', dashed: true },
        ].map(({ color, label, dashed }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dashed ? '5 3' : 'none'} /></svg>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ city, mode, onModeChange, onGoHome }) {
  const clock = useClock()
  const timeStr = clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, background: 'rgba(5,8,16,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 24 }}>
      {/* Logo */}
      <div
        onClick={onGoHome}
        style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #F5A623, #00D4FF)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={17} color="#000" fill="#000" />
        </div>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>SolarWind IQ</span>
      </div>

      {/* Center info */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <MapPin size={13} color="#F5A623" />
          <span style={{ color: '#fff', fontWeight: 500 }}>{city}</span>
        </div>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Clock size={13} color="#00D4FF" />
          <span style={{ fontFamily: 'Syne', color: '#fff', letterSpacing: '0.06em', fontSize: 13 }}>{timeStr}</span>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="mode-pill">
        <button className={`mode-pill-btn ${mode === 'solar' ? 'active-solar' : ''}`} onClick={() => onModeChange('solar')}>
          ☀ Solar
        </button>
        <button className={`mode-pill-btn ${mode === 'wind' ? 'active-wind' : ''}`} onClick={() => onModeChange('wind')}>
          ◎ Wind
        </button>
      </div>
    </header>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ mode }) {
  const icons = [
    { Icon: BarChart2, label: 'Forecast',    active: true },
    { Icon: Brain,     label: 'Explain',     active: false },
    { Icon: Activity,  label: 'Performance', active: false },
    { Icon: Settings,  label: 'Settings',    active: false },
  ]
  const dotColor = mode === 'wind' ? '#00D4FF' : '#F5A623'
  return (
    <aside style={{ position: 'fixed', left: 0, top: 60, bottom: 0, width: 64, background: 'rgba(5,8,16,0.9)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, gap: 6, zIndex: 50 }}>
      {icons.map(({ Icon, label, active }) => (
        <div key={label} className={`sidebar-icon ${active ? (mode === 'wind' ? 'active-wind-icon' : 'active') : ''}`} title={label}>
          <Icon size={18} />
          {active && <div className="sidebar-dot" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />}
        </div>
      ))}
    </aside>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroScreen({ onSearch }) {
  const [query, setQuery] = useState('')
  const particles = Array.from({ length: 12 })

  const submit = (e) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#050810' }}>
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {particles.map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              bottom: `${-5 - (i * 13) % 20}%`,
              left: `${(i * 831 + 200) % 100}%`,
              animationDelay: `${(i * 1.9) % 14}s`,
              animationDuration: `${12 + (i * 3) % 12}s`,
            }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 780, padding: '0 32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 9999, padding: '6px 16px', marginBottom: 32 }}>
          <Zap size={12} color="#F5A623" fill="#F5A623" />
          <span style={{ fontSize: 11, color: '#F5A623', fontWeight: 600, letterSpacing: '0.1em' }}>AI-POWERED · REAL-TIME FORECASTING</span>
        </div>

        <h1 className="hero-title" style={{ fontSize: 'clamp(56px, 9vw, 104px)', lineHeight: 1.0, marginBottom: 24, color: '#fff' }}>
          Solar<span style={{ color: '#F5A623' }}>Wind</span>{' '}
          <span style={{ color: '#00D4FF' }}>IQ</span>
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(255,255,255,0.45)', marginBottom: 52, lineHeight: 1.7, letterSpacing: '0.01em' }}>
          AI-Powered Renewable Energy Forecasting.<br />
          Any Location. Any Technology.
        </p>

        <form onSubmit={submit} style={{ marginBottom: 32 }}>
          <div
            className="search-bar"
            style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '4px 4px 4px 20px', gap: 12 }}
          >
            <Search size={18} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter any city — Mumbai, Gujarat, Berlin..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontFamily: 'DM Sans', padding: '14px 0' }}
            />
            <button
              type="submit"
              style={{ flexShrink: 0, background: 'linear-gradient(135deg, #F5A623, #FF8C00)', border: 'none', borderRadius: 12, padding: '13px 26px', color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Syne', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Analyze <ChevronRight size={14} />
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['94.2%','Forecast Accuracy'],['150+','Geographies'],['Hourly','Resolution']].map(([v, l]) => (
            <div key={l} className="stat-pill"><span>{v}</span> {l}</div>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, #050810)', pointerEvents: 'none' }} />
    </div>
  )
}

// ── Glowing Divider ───────────────────────────────────────────────────────────
function Divider({ mode }) {
  const color = mode === 'solar' ? 'rgba(245,166,35,0.25)' : 'rgba(0,212,255,0.25)'
  return (
    <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, margin: '8px 0 20px', border: 'none' }} />
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ city, mode, onModeChange, onGoHome }) {
  const [active, setActive] = useState(false)
  const [chartData, setChartData] = useState([])

  // single weather fetch shared by TempCard + WeatherCard
  const { wx, loading: wxLoading, usingMock } = useWeather(city, active)

  useEffect(() => {
    setActive(false)
    const seed = city.charCodeAt(0) || 42
    const [p50, p10, p90] = mode === 'solar'
      ? [solarP50, solarP10, solarP90]
      : [windP50, windP10, windP90]
    const t = setTimeout(() => {
      setChartData(buildChartData(p50, p10, p90, seed))
      setActive(true)
    }, 150)
    return () => clearTimeout(t)
  }, [mode, city])

  document.title = `SolarWind IQ — ${city}`

  const accent   = mode === 'solar' ? '#F5A623' : '#00D4FF'
  const totalKwh = mode === 'solar' ? 487 : 843
  const peakTime = mode === 'solar' ? '1:00 PM' : '4:00 PM'
  const co2      = mode === 'solar' ? 342 : 591

  return (
    <div style={{ background: '#050810', minHeight: '100vh', paddingTop: 60 }}>
      <Navbar city={city} mode={mode} onModeChange={onModeChange} onGoHome={onGoHome} />
      <Sidebar mode={mode} />

      <main style={{ marginLeft: 64, padding: '32px 32px 48px' }}>
        {/* S1 — Forecast Chart */}
        <ForecastChart data={chartData} mode={mode} active={active} />
        <Divider mode={mode} />

        {/* S2 — KPI Row (5 cards: 4 existing + live temp) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
          <KpiCard label="Estimated Output"  value={totalKwh} unit="kWh" Icon={Zap}        accent={accent}   delay="0.2s"  active={active} />
          <KpiCard label="Peak Generation"   value={peakTime}             Icon={Sun}        accent={accent}   delay="0.25s" active={active} isString />
          <KpiCard label="CO₂ Offset"        value={co2}      unit="kg"  Icon={Leaf}       accent="#00FF94"  delay="0.3s"  active={active} />
          <KpiCard label="Forecast Accuracy" value={94.2}     unit="%"   Icon={TrendingUp} accent="#00D4FF"  delay="0.35s" active={active} />
          <TempCard wx={wx} loading={wxLoading} usingMock={usingMock} delay="0.4s" />
        </div>
        <Divider mode={mode} />

        {/* S3 — SHAP + Weather */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 20 }}>
          <ShapPanel active={active} />
          <WeatherCard city={city} wx={wx} loading={wxLoading} usingMock={usingMock} />
        </div>
        <Divider mode={mode} />

        {/* S4 — Benchmark */}
        <BenchmarkPanel active={active} />
      </main>

      <footer style={{ marginLeft: 64, padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
          SolarWind IQ · Temporal Fusion Transformer · Quantile Regression · SHAP Explainability
        </span>
      </footer>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [city,    setCity]    = useState(null)
  const [mode,    setMode]    = useState('solar')
  const [visible, setVisible] = useState(false)

  const handleSearch = useCallback((q) => {
    setVisible(false)
    setTimeout(() => { setCity(q); setVisible(true) }, 80)
  }, [])

  const handleGoHome = useCallback(() => {
    setVisible(false)
    setTimeout(() => { setCity(null) }, 300)
  }, [])

  if (!city) return <HeroScreen onSearch={handleSearch} />

  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.5s ease, transform 0.5s ease' }}>
      <Dashboard city={city} mode={mode} onModeChange={setMode} onGoHome={handleGoHome} />
    </div>
  )
}
