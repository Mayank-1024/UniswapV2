import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ethers } from 'ethers';
import { Token } from '../utils/tokens';

interface ReservesCurveProps {
  token0: Token;
  token1: Token;
  reserve0: ethers.BigNumber;
  reserve1: ethers.BigNumber;
  currentPoint?: {
    x: number;
    y: number;
  };
}

export const ReservesCurve: React.FC<ReservesCurveProps> = ({
  token0,
  token1,
  reserve0,
  reserve1,
  currentPoint
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !reserve0 || !reserve1) return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Convert reserves to numbers for plotting
    const r0 = parseFloat(ethers.utils.formatUnits(reserve0, token0.decimals));
    const r1 = parseFloat(ethers.utils.formatUnits(reserve1, token1.decimals));
    
    // Calculate k (constant product)
    const k = r0 * r1;
    
    // Generate points for the curve
    const points = [];
    const numPoints = 200;
    
    // Show range from 0.1x to 2x current reserves
    const minX = r0 * 0.1;
    const maxX = r0 * 2;
    
    for (let i = 0; i < numPoints; i++) {
      const x = minX + ((maxX - minX) * i) / (numPoints - 1);
      const y = k / x;
      points.push({ x, y });
    }

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          // Constant product curve
          {
            label: 'x * y = k',
            data: points,
            borderColor: 'rgba(34, 197, 94, 0.9)', // green-500
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
          },
          // Current point P
          {
            label: 'Current Position (P)',
            data: [{ x: r0, y: r1 }],
            backgroundColor: 'rgba(107, 114, 128, 1)', // gray-500
            borderColor: 'rgba(229, 231, 235, 0.8)', // gray-200 border
            pointStyle: 'circle',
            pointRadius: 6,
            pointHoverRadius: 8,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'nearest'
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: `${token0.symbol} Reserve`,
              color: '#e5e7eb',
            },
            grid: {
              color: 'rgba(75, 85, 99, 0.3)', // soft gray-600
            },
            ticks: {
              color: '#9ca3af', // gray-400
            }
          },
          y: {
            type: 'linear',
            title: {
              display: true,
              text: `${token1.symbol} Reserve`,
              color: '#e5e7eb',
            },
            grid: {
              color: 'rgba(75, 85, 99, 0.3)',
            },
            ticks: {
              color: '#9ca3af',
            }
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const point = context.raw as { x: number; y: number };
                const dataset = context.dataset;
                if (dataset.label === 'Current Position (P)') {
                  return [
                    `${token0.symbol}: ${point.x.toFixed(6)}`,
                    `${token1.symbol}: ${point.y.toFixed(6)}`,
                    `k = ${k.toFixed(6)}`
                  ];
                }
                return `${token0.symbol}: ${point.x.toFixed(6)}, ${token1.symbol}: ${point.y.toFixed(6)}`;
              },
            },
            backgroundColor: '#1f2937', // dark tooltip
            titleColor: '#f9fafb',
            bodyColor: '#d1d5db',
            borderColor: '#4b5563',
            borderWidth: 1,
          },
          legend: {
            labels: {
              color: '#d1d5db',
            }
          },
          title: {
            display: true,
            text: 'Constant Product AMM Curve',
            color: '#f3f4f6',
            font: {
              size: 16,
              weight: 'bold',
            }
          }
        },
      },
    });


    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [token0, token1, reserve0, reserve1]);

  return (
    <div className="w-full h-96 bg-darker rounded-lg p-4">
      <canvas ref={chartRef} />
    </div>
  );
}; 