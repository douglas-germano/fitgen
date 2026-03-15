/**
 * Apple HIG Chart Configuration
 * Centralized colors and styling for all charts
 */

export const chartColors = {
    // Primary semantic colors
    primary: 'var(--chart-blue)',
    success: 'var(--chart-green)',
    warning: 'var(--chart-orange)',
    danger: 'var(--chart-red)',
    secondary: 'var(--chart-purple)',
    info: 'var(--chart-teal)',

    // Nutrition-specific colors
    protein: 'var(--chart-blue)',
    carbs: 'var(--chart-green)',
    fats: 'var(--chart-orange)',
    calories: 'var(--chart-red)',

    // Metrics-specific colors
    weight: 'var(--chart-blue)',
    bodyFat: 'var(--chart-orange)',
    muscle: 'var(--chart-green)',

    // Other
    hydration: 'var(--chart-teal)',
    workout: 'var(--chart-purple)',

    // Chart elements
    grid: 'var(--chart-grid)',
    axis: 'var(--chart-axis)',
} as const;

export const chartConfig = {
    // Stroke widths (Apple HIG: thinner, more elegant)
    lineStrokeWidth: 2,
    areaStrokeWidth: 2,

    // Bar styling
    barRadius: [4, 4, 0, 0] as [number, number, number, number],

    // Dots
    dotRadius: 3,
    activeDotRadius: 5,

    // Grid
    gridStrokeDasharray: '3 3',
    gridOpacity: 0.05,

    // Tooltip styling
    tooltip: {
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },

    // Axis styling
    axis: {
        fontSize: 12,
        fill: 'var(--chart-axis)',
        tickLine: false,
        axisLine: false,
    },

    // Margins
    defaultMargin: { top: 20, right: 30, left: 0, bottom: 0 },
} as const;

// Gradient IDs for area charts
export const chartGradients = {
    blue: 'colorBlueGradient',
    green: 'colorGreenGradient',
    orange: 'colorOrangeGradient',
    red: 'colorRedGradient',
    purple: 'colorPurpleGradient',
    teal: 'colorTealGradient',
} as const;
