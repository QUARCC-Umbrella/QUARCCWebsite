import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';

// Sort and deduplicate data by timestamp
const processChartData = (rawData) => {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];
  
  // Sort by time ascending
  const sorted = [...rawData].sort((a, b) => a.time - b.time);
  
  // Deduplicate - keep last value for each timestamp
  const seen = new Map();
  for (const point of sorted) {
    // Ensure time is a Unix timestamp in seconds
    const time = typeof point.time === 'number' ? point.time : Math.floor(new Date(point.time).getTime() / 1000);
    seen.set(time, point.value);
  }
  
  // Convert back to array and ensure proper order
  const result = Array.from(seen.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time, value }));
  
  return result;
};

const PortfolioChart = ({ 
  data = [], 
  height = 200,
  accentColor = '#8957e5',
  showTimeScale = true 
}) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // Process data to ensure proper ordering
  const processedData = useMemo(() => processChartData(data), [data]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Chart options matching project dark theme
    const chartOptions = {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#c9d1d9',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(48, 54, 61, 0.5)' },
        horzLines: { color: 'rgba(48, 54, 61, 0.5)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#58a6ff',
          width: 1,
          style: 2,
          labelBackgroundColor: '#8957e5',
        },
        horzLine: {
          color: '#58a6ff',
          width: 1,
          style: 2,
          labelBackgroundColor: '#8957e5',
        },
      },
      rightPriceScale: {
        borderColor: '#30363d',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    };

    // Create chart
    chartRef.current = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: height,
    });

    // Add area series
    seriesRef.current = chartRef.current.addSeries(AreaSeries, {
      topColor: `${accentColor}40`,
      bottomColor: `${accentColor}05`,
      lineColor: accentColor,
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price) => {
          if (Math.abs(price) >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
          if (Math.abs(price) >= 1e6) return `$${(price / 1e6).toFixed(1)}M`;
          return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        },
      },
    });

    // Set initial data
    if (processedData.length > 0) {
      seriesRef.current.setData(processedData);
      chartRef.current.timeScale().fitContent();
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []); // Only run on mount

  // Update data when it changes
  useEffect(() => {
    if (seriesRef.current && processedData.length > 0) {
      seriesRef.current.setData(processedData);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [processedData]);

  // Update chart height when prop changes
  useEffect(() => {
    if (chartRef.current && height) {
      chartRef.current.applyOptions({ height });
    }
  }, [height]);

  return (
    <div 
      ref={chartContainerRef} 
      className="portfolio-chart"
      style={{ 
        width: '100%', 
        height: `${height}px`,
      }}
    />
  );
};

export default PortfolioChart;
