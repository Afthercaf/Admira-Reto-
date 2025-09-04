// src/components/layout/Dashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Calendar, Filter, TrendingUp, Thermometer, Cloud, Sun, Activity, Loader } from 'lucide-react';
import './Dashboard.css';

const API_BASE_URL = 'http://localhost:4000';

interface WeatherData {
  date: string;
  city: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  precipitation: number;
}

interface DateRange {
  start: string;
  end: string;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<WeatherData[]>([]);
  const [filteredData, setFilteredData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: '2024-01-01',
    end: '2024-03-31'
  });
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  // Cargar datos desde el backend
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/weather`);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const weatherData = await response.json();
        setData(weatherData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar datos');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = data.filter(item => {
      const itemDate = new Date(item.date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      const dateInRange = itemDate >= startDate && itemDate <= endDate;
      const cityMatch = selectedCity === 'All' || item.city === selectedCity;
      
      return dateInRange && cityMatch;
    });
    
    setFilteredData(filtered);
  }, [data, selectedCity, dateRange]);

  // TRANSFORMACIÓN 1: Agregación temporal por ciudad
  const cityAggregation = useMemo(() => {
    const aggregated = filteredData.reduce((acc, item) => {
      if (!acc[item.city]) {
        acc[item.city] = {
          city: item.city,
          totalTemp: 0,
          totalHumidity: 0,
          totalPressure: 0,
          totalWind: 0,
          count: 0
        };
      }
      
      acc[item.city].totalTemp += item.temperature;
      acc[item.city].totalHumidity += item.humidity;
      acc[item.city].totalPressure += item.pressure;
      acc[item.city].totalWind += item.windSpeed;
      acc[item.city].count += 1;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(aggregated).map((city: any) => ({
      city: city.city,
      avgTemperature: Math.round((city.totalTemp / city.count) * 10) / 10,
      avgHumidity: Math.round((city.totalHumidity / city.count) * 10) / 10,
      avgPressure: Math.round((city.totalPressure / city.count) * 10) / 10,
      avgWindSpeed: Math.round((city.totalWind / city.count) * 10) / 10,
      records: city.count
    }));
  }, [filteredData]);

  // TRANSFORMACIÓN 2: Rolling Window (Media móvil de 7 días)
  const rollingAverage = useMemo(() => {
    const sortedData = [...filteredData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dailyAvgs = sortedData.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = { date: item.date, temps: [], humidities: [] };
      }
      acc[item.date].temps.push(item.temperature);
      acc[item.date].humidities.push(item.humidity);
      return acc;
    }, {} as Record<string, any>);

    const dailyData = Object.values(dailyAvgs).map((day: any) => ({
      date: day.date,
      avgTemp: day.temps.reduce((sum: number, temp: number) => sum + temp, 0) / day.temps.length,
      avgHumidity: day.humidities.reduce((sum: number, hum: number) => sum + hum, 0) / day.humidities.length
    }));

    return dailyData.map((item, index) => {
      const windowStart = Math.max(0, index - 3);
      const windowEnd = Math.min(dailyData.length - 1, index + 3);
      const window = dailyData.slice(windowStart, windowEnd + 1);
      
      const rollingTemp = window.reduce((sum, d) => sum + d.avgTemp, 0) / window.length;
      
      return {
        ...item,
        rollingAvgTemp: Math.round(rollingTemp * 10) / 10
      };
    });
  }, [filteredData]);

  // TRANSFORMACIÓN 3: Ratios y cálculos derivados
  const ratiosAndMetrics = useMemo(() => {
    return filteredData.map(item => {
      const ratio = item.humidity !== 0 
        ? Math.round((item.temperature / item.humidity) * 100) / 100 
        : 0;

      return {
        ...item,
        tempHumidityRatio: ratio,
        comfortIndex: Math.round((item.temperature - (item.humidity / 10)) * 10) / 10,
        pressureVariation: Math.round((item.pressure - 1013) * 10) / 10
      };
    });
  }, [filteredData]);

  // TRANSFORMACIÓN 4: Top 3 ciudades por temperatura máxima
  const topCitiesByMaxTemp = useMemo(() => {
    const cityMaxTemps = filteredData.reduce((acc, item) => {
      if (!acc[item.city] || item.temperature > acc[item.city].maxTemp) {
        acc[item.city] = {
          city: item.city,
          maxTemp: item.temperature,
          date: item.date
        };
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(cityMaxTemps)
      .sort((a, b) => b.maxTemp - a.maxTemp)
      .slice(0, 3);
  }, [filteredData]);

  // TRANSFORMACIÓN 5: Porcentaje de cambio de temperatura por ciudad
  const temperatureChange = useMemo(() => {
    const citiesData = filteredData.reduce((acc, item) => {
      if (!acc[item.city]) {
        acc[item.city] = [];
      }
      acc[item.city].push(item);
      return acc;
    }, {} as Record<string, WeatherData[]>);

    return Object.entries(citiesData).map(([city, records]) => {
      if (records.length < 2) return { city, change: 0 };
      
      const sortedRecords = records.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      const firstTemp = sortedRecords[0].temperature;
      const lastTemp = sortedRecords[sortedRecords.length - 1].temperature;
      const change = ((lastTemp - firstTemp) / firstTemp) * 100;
      
      return {
        city,
        change: Math.round(change * 10) / 10,
        firstTemp,
        lastTemp,
        firstDate: sortedRecords[0].date,
        lastDate: sortedRecords[sortedRecords.length - 1].date
      };
    });
  }, [filteredData]);

  // Datos para distribuciones (Pie Chart)
  const temperatureRanges = useMemo(() => {
    const ranges = ratiosAndMetrics.reduce((acc, item) => {
      let range: string;
      if (item.temperature < 10) range = 'Frío (<10°C)';
      else if (item.temperature < 20) range = 'Templado (10-20°C)';
      else if (item.temperature < 30) range = 'Cálido (20-30°C)';
      else range = 'Muy Cálido (>30°C)';
      
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(ranges).map(([range, count]) => ({
      name: range,
      value: count,
      percentage: Math.round((count / ratiosAndMetrics.length) * 100)
    }));
  }, [ratiosAndMetrics]);

  // Obtener ciudades únicas
  const cities = useMemo(() => {
    return ['All', ...new Set(data.map(item => item.city))];
  }, [data]);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner">
            <Loader className="spinner-icon" />
          </div>
          <h2 className="loading-title">Cargando datos meteorológicos...</h2>
          <p className="loading-subtitle">Conectando con la API del clima</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <Cloud className="error-icon" />
          <h2 className="error-title">Error en el servicio meteorológico</h2>
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title-section">
            <Sun className="header-icon" />
            <div>
              <h1 className="header-title">Dashboard Meteorológico</h1>
              <p className="header-subtitle">Análisis en tiempo real con transformaciones de datos</p>
            </div>
          </div>
          <div className="status-badge">
            Datos en Vivo
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-header">
            <Filter className="filter-icon" />
            <h3 className="filters-title">Filtros de Datos</h3>
          </div>
          
          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">Rango de Fechas</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="date-input"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="date-input"
                />
              </div>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Ciudad</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="city-select"
              >
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-stats">
              <div className="stat-item">
                <span className="stat-number">{filteredData.length}</span>
                <span className="stat-label">registros filtrados</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{data.length}</span>
                <span className="stat-label">registros totales</span>
              </div>
            </div>
          </div>
        </section>

        {/* Visualizaciones */}
        <div className="charts-grid">
          {/* VISUALIZACIÓN 1: Tendencia temporal con media móvil */}
          <div className={`chart-card ${selectedChart === 'trend' ? 'chart-selected' : ''}`}>
            <div className="chart-header">
              <TrendingUp className="chart-icon trend-icon" />
              <h3 className="chart-title">Tendencia Temporal + Media Móvil (7 días)</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={rollingAverage}>
                  <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                  <XAxis 
                    dataKey="date" 
                    className="chart-axis"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="chart-axis" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    className="chart-tooltip"
                    formatter={(value: any, name: string) => [
                      `${value}°C`, 
                      name === 'avgTemp' ? 'Temperatura Media' : 'Media Móvil 7 días'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgTemp" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={{ r: 3 }}
                    className="line-primary"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rollingAvgTemp" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    strokeDasharray="5 5"
                    className="line-secondary"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VISUALIZACIÓN 2: Comparativa por ciudades (Agregación) */}
          <div className={`chart-card ${selectedChart === 'cities' ? 'chart-selected' : ''}`}>
            <div className="chart-header">
              <Thermometer className="chart-icon temp-icon" />
              <h3 className="chart-title">Promedios por Ciudad (Agregación Temporal)</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cityAggregation}>
                  <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                  <XAxis 
                    dataKey="city" 
                    className="chart-axis"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="chart-axis" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    className="chart-tooltip"
                    formatter={(value: any) => [`${value}°C`, 'Temperatura Promedio']}
                  />
                  <Bar 
                    dataKey="avgTemperature" 
                    className="bar-primary"
                    onClick={() => setSelectedChart(selectedChart === 'cities' ? null : 'cities')}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VISUALIZACIÓN 3: Análisis de ratios */}
          <div className={`chart-card ${selectedChart === 'ratios' ? 'chart-selected' : ''}`}>
            <div className="chart-header">
              <Activity className="chart-icon activity-icon" />
              <h3 className="chart-title">Análisis de Ratios e Índices</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={ratiosAndMetrics.filter(d => d.comfortIndex !== undefined && d.tempHumidityRatio !== undefined)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="comfortIndex" 
                    stroke="#f97316" 
                    fill="#f97316"
                    onClick={() => setSelectedChart(selectedChart === 'ratios' ? null : 'ratios')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tempHumidityRatio" 
                    stroke="#06b6d4" 
                    fill="#06b6d4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VISUALIZACIÓN 4: Distribución de temperaturas */}
          <div className={`chart-card ${selectedChart === 'distribution' ? 'chart-selected' : ''}`}>
            <div className="chart-header">
              <Cloud className="chart-icon cloud-icon" />
              <h3 className="chart-title">Distribución de Rangos de Temperatura</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={temperatureRanges}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({name, percentage}) => `${name}: ${percentage}%`}
                    className="pie-chart"
                    onClick={() => setSelectedChart(selectedChart === 'distribution' ? null : 'distribution')}
                  >
                    {temperatureRanges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    className="chart-tooltip"
                    formatter={(value: any) => [`${value} registros`, 'Cantidad']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VISUALIZACIÓN 5: Top 3 ciudades por temperatura máxima */}
          <div className={`chart-card ${selectedChart === 'topCities' ? 'chart-selected' : ''}`}>
            <div className="chart-header">
              <Activity className="chart-icon activity-icon" />
              <h3 className="chart-title">Top 3 Ciudades por Temperatura Máxima</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCitiesByMaxTemp}>
                  <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                  <XAxis 
                    dataKey="city" 
                    className="chart-axis"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="chart-axis" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    className="chart-tooltip"
                    formatter={(value: any) => [`${value}°C`, 'Temperatura Máxima']}
                    labelFormatter={(label) => `Ciudad: ${label}`}
                  />
                  <Bar 
                    dataKey="maxTemp" 
                    className="bar-primary"
                    onClick={() => setSelectedChart(selectedChart === 'topCities' ? null : 'topCities')}
                  >
                    {topCitiesByMaxTemp.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VISUALIZACIÓN 6: Porcentaje de cambio de temperatura */}
          <div className={`chart-card ${selectedChart === 'change' ? 'chart-selected' : ''}`}>
            <div className="chart-header">
              <TrendingUp className="chart-icon trend-icon" />
              <h3 className="chart-title">Cambio Porcentual de Temperatura</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={temperatureChange}>
                  <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
                  <XAxis 
                    dataKey="city" 
                    className="chart-axis"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="chart-axis" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    className="chart-tooltip"
                    formatter={(value: any) => [`${value}%`, 'Cambio Porcentual']}
                    labelFormatter={(label) => `Ciudad: ${label}`}
                  />
                  <Bar 
                    dataKey="change" 
                    className="bar-primary"
                    onClick={() => setSelectedChart(selectedChart === 'change' ? null : 'change')}
                  >
                    {temperatureChange.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.change >= 0 ? '#4ade80' : '#f87171'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Drill-down detail */}
        {selectedChart && (
          <section className="drill-down-section">
            <div className="drill-down-header">
              <h3>Detalles del Gráfico Seleccionado</h3>
              <button 
                className="close-button"
                onClick={() => setSelectedChart(null)}
              >
                ✕
              </button>
            </div>
            <div className="drill-down-content">
              {selectedChart === 'cities' && (
                <div className="detail-grid">
                  {cityAggregation.map((city, index) => (
                    <div key={city.city} className="detail-card">
                      <h4>{city.city}</h4>
                      <div className="detail-metrics">
                        <div className="metric">
                          <span className="metric-label">Temp. Promedio:</span>
                          <span className="metric-value">{city.avgTemperature}°C</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Humedad Promedio:</span>
                          <span className="metric-value">{city.avgHumidity}%</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Registros:</span>
                          <span className="metric-value">{city.records}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedChart === 'topCities' && (
                <div className="detail-grid">
                  {topCitiesByMaxTemp.map((city, index) => (
                    <div key={city.city} className="detail-card">
                      <h4>{index + 1}. {city.city}</h4>
                      <div className="detail-metrics">
                        <div className="metric">
                          <span className="metric-label">Temperatura Máxima:</span>
                          <span className="metric-value">{city.maxTemp}°C</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Fecha:</span>
                          <span className="metric-value">{city.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedChart === 'change' && (
                <div className="detail-grid">
                  {temperatureChange.map((city, index) => (
                    <div key={city.city} className="detail-card">
                      <h4>{city.city}</h4>
                      <div className="detail-metrics">
                        <div className="metric">
                          <span className="metric-label">Cambio Porcentual:</span>
                          <span className={`metric-value ${city.change >= 0 ? 'positive' : 'negative'}`}>
                            {city.change >= 0 ? '+' : ''}{city.change}%
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Temperatura Inicial:</span>
                          <span className="metric-value">{city.firstTemp}°C ({city.firstDate})</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Temperatura Final:</span>
                          <span className="metric-value">{city.lastTemp}°C ({city.lastDate})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Resumen de transformaciones */}
        <section className="transformations-section">
          <h3 className="transformations-title">Transformaciones de Datos Aplicadas</h3>
          <div className="transformations-grid">
            <div className="transformation-card">
              <h4 className="transformation-title">1. Agregación Temporal</h4>
              <p className="transformation-description">
                Cálculo de promedios de temperatura, humedad y presión por ciudad durante el período filtrado.
                Fórmula: Σ(valores) / n registros
              </p>
            </div>
            <div className="transformation-card">
              <h4 className="transformation-title">2. Ventana Deslizante (Rolling Window)</h4>
              <p className="transformation-description">
                Media móvil de 7 días para suavizar tendencias de temperatura.
                Fórmula: Σ(valores ventana) / tamaño_ventana
              </p>
            </div>
            <div className="transformation-card">
              <h4 className="transformation-title">3. Cálculos de Ratios</h4>
              <p className="transformation-description">
                Índice de confort = Temperatura - (Humedad/10)<br/>
                Ratio Temp/Humedad = Temperatura / Humedad
              </p>
            </div>
            <div className="transformation-card">
              <h4 className="transformation-title">4. Top-N por Métrica</h4>
              <p className="transformation-description">
                Identificación de las 3 ciudades con temperaturas máximas más altas.
                Ordenamiento descendente y selección de los primeros 3 elementos.
              </p>
            </div>
            <div className="transformation-card">
              <h4 className="transformation-title">5. Cálculo de Porcentaje de Cambio</h4>
              <p className="transformation-description">
                Cambio porcentual = ((T_final - T_inicial) / T_inicial) × 100<br/>
                Calculado para cada ciudad en el período seleccionado.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;