# TRUEFIBACKEND/agents/chart_generator.py
# Chart generation module for financial visualizations

import json
import base64
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ChartGenerator:
    """Generate chart specifications for frontend rendering"""

    @staticmethod
    def generate_line_chart(
        data: List[Dict[str, Any]],
        x_field: str,
        y_fields: Union[str, List[str]],
        title: str = "",
        x_label: str = "",
        y_label: str = "",
        colors: Optional[List[str]] = None,
        chart_type: str = "line"
    ) -> Dict[str, Any]:
        """
        Generate line/area chart specification

        Args:
            data: List of data points
            x_field: Field name for x-axis
            y_fields: Field name(s) for y-axis (can be single or multiple series)
            title: Chart title
            x_label: X-axis label
            y_label: Y-axis label
            colors: Custom colors for series
            chart_type: 'line', 'area', or 'smooth'

        Returns:
            Chart specification for frontend rendering
        """
        if isinstance(y_fields, str):
            y_fields = [y_fields]

        if colors is None:
            colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

        series = []
        for i, field in enumerate(y_fields):
            series.append({
                'name': field.replace('_', ' ').title(),
                'data': [point.get(field, 0) for point in data],
                'color': colors[i % len(colors)]
            })

        return {
            'type': 'chart',
            'chart_type': chart_type,
            'config': {
                'title': title,
                'x_axis': {
                    'label': x_label or x_field.replace('_', ' ').title(),
                    'data': [point.get(x_field) for point in data],
                    'type': 'category' if isinstance(data[0].get(x_field), str) else 'numeric'
                },
                'y_axis': {
                    'label': y_label or 'Value',
                    'format': 'currency' if any(word in y_label.lower() for word in ['$', 'dollar', 'amount', 'value']) else 'number'
                },
                'series': series,
                'options': {
                    'responsive': True,
                    'maintainAspectRatio': False,
                    'legend': len(series) > 1,
                    'tooltip': True,
                    'animation': True
                }
            }
        }

    @staticmethod
    def generate_bar_chart(
        data: List[Dict[str, Any]],
        x_field: str,
        y_field: str,
        title: str = "",
        x_label: str = "",
        y_label: str = "",
        color: str = "#3b82f6",
        orientation: str = "vertical"
    ) -> Dict[str, Any]:
        """
        Generate bar chart specification

        Returns:
            Chart specification for frontend rendering
        """
        return {
            'type': 'chart',
            'chart_type': 'bar',
            'config': {
                'title': title,
                'orientation': orientation,
                'x_axis': {
                    'label': x_label or x_field.replace('_', ' ').title(),
                    'data': [point.get(x_field) for point in data]
                },
                'y_axis': {
                    'label': y_label or y_field.replace('_', ' ').title(),
                    'data': [point.get(y_field, 0) for point in data],
                    'format': 'currency' if any(word in y_field.lower() for word in ['amount', 'value', 'balance']) else 'number'
                },
                'color': color,
                'options': {
                    'responsive': True,
                    'indexAxis': 'x' if orientation == 'vertical' else 'y'
                }
            }
        }

    @staticmethod
    def generate_pie_chart(
        data: List[Dict[str, Any]],
        label_field: str,
        value_field: str,
        title: str = "",
        colors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate pie/donut chart specification

        Returns:
            Chart specification for frontend rendering
        """
        if colors is None:
            colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

        return {
            'type': 'chart',
            'chart_type': 'pie',
            'config': {
                'title': title,
                'data': {
                    'labels': [point.get(label_field) for point in data],
                    'values': [point.get(value_field, 0) for point in data],
                    'colors': colors[:len(data)]
                },
                'options': {
                    'responsive': True,
                    'legend': True,
                    'tooltip': {
                        'format': 'currency' if any(word in value_field.lower() for word in ['amount', 'value', 'balance']) else 'percent'
                    }
                }
            }
        }

    @staticmethod
    def generate_scatter_plot(
        data: List[Dict[str, Any]],
        x_field: str,
        y_field: str,
        size_field: Optional[str] = None,
        color_field: Optional[str] = None,
        title: str = "",
        x_label: str = "",
        y_label: str = ""
    ) -> Dict[str, Any]:
        """
        Generate scatter plot specification

        Returns:
            Chart specification for frontend rendering
        """
        points = []
        for point in data:
            scatter_point = {
                'x': point.get(x_field, 0),
                'y': point.get(y_field, 0)
            }
            if size_field:
                scatter_point['size'] = point.get(size_field, 5)
            if color_field:
                scatter_point['color'] = point.get(color_field)
            points.append(scatter_point)

        return {
            'type': 'chart',
            'chart_type': 'scatter',
            'config': {
                'title': title,
                'x_axis': {
                    'label': x_label or x_field.replace('_', ' ').title()
                },
                'y_axis': {
                    'label': y_label or y_field.replace('_', ' ').title()
                },
                'data': points,
                'options': {
                    'responsive': True,
                    'showLine': False,
                    'scales': {
                        'x': {'type': 'linear'},
                        'y': {'type': 'linear'}
                    }
                }
            }
        }

    @staticmethod
    def generate_candlestick_chart(
        data: List[Dict[str, Any]],
        date_field: str = 'date',
        open_field: str = 'open',
        high_field: str = 'high',
        low_field: str = 'low',
        close_field: str = 'close',
        title: str = "Price Chart"
    ) -> Dict[str, Any]:
        """
        Generate candlestick chart for investment data

        Returns:
            Chart specification for frontend rendering
        """
        candles = []
        for point in data:
            candles.append({
                'x': point.get(date_field),
                'o': point.get(open_field, 0),
                'h': point.get(high_field, 0),
                'l': point.get(low_field, 0),
                'c': point.get(close_field, 0),
                'color': '#10b981' if point.get(close_field, 0) >= point.get(open_field, 0) else '#ef4444'
            })

        return {
            'type': 'chart',
            'chart_type': 'candlestick',
            'config': {
                'title': title,
                'data': candles,
                'options': {
                    'responsive': True,
                    'scales': {
                        'x': {'type': 'time'},
                        'y': {'type': 'linear', 'position': 'right'}
                    }
                }
            }
        }

    @staticmethod
    def generate_heatmap(
        data: List[List[float]],
        x_labels: List[str],
        y_labels: List[str],
        title: str = "",
        color_scheme: str = "RdYlGn"
    ) -> Dict[str, Any]:
        """
        Generate heatmap specification

        Returns:
            Chart specification for frontend rendering
        """
        return {
            'type': 'chart',
            'chart_type': 'heatmap',
            'config': {
                'title': title,
                'data': data,
                'x_labels': x_labels,
                'y_labels': y_labels,
                'color_scheme': color_scheme,
                'options': {
                    'responsive': True,
                    'tooltip': True
                }
            }
        }

    @staticmethod
    def generate_waterfall_chart(
        data: List[Dict[str, Any]],
        label_field: str = 'category',
        value_field: str = 'value',
        title: str = "Waterfall Chart"
    ) -> Dict[str, Any]:
        """
        Generate waterfall chart for showing incremental changes

        Returns:
            Chart specification for frontend rendering
        """
        running_total = 0
        waterfall_data = []

        for i, point in enumerate(data):
            value = point.get(value_field, 0)
            start = running_total
            running_total += value

            waterfall_data.append({
                'label': point.get(label_field),
                'start': start,
                'end': running_total,
                'value': value,
                'color': '#10b981' if value >= 0 else '#ef4444'
            })

        return {
            'type': 'chart',
            'chart_type': 'waterfall',
            'config': {
                'title': title,
                'data': waterfall_data,
                'options': {
                    'responsive': True,
                    'showTotal': True
                }
            }
        }

    @staticmethod
    def generate_gauge_chart(
        value: float,
        min_value: float = 0,
        max_value: float = 100,
        title: str = "",
        segments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate gauge chart for showing single metrics

        Returns:
            Chart specification for frontend rendering
        """
        if segments is None:
            # Default segments for percentage-based metrics
            segments = [
                {'min': 0, 'max': 30, 'color': '#ef4444', 'label': 'Low'},
                {'min': 30, 'max': 70, 'color': '#f59e0b', 'label': 'Medium'},
                {'min': 70, 'max': 100, 'color': '#10b981', 'label': 'High'}
            ]

        return {
            'type': 'chart',
            'chart_type': 'gauge',
            'config': {
                'title': title,
                'value': value,
                'min': min_value,
                'max': max_value,
                'segments': segments,
                'options': {
                    'responsive': True,
                    'animation': True
                }
            }
        }

    @staticmethod
    def generate_monte_carlo_chart(
        paths: Dict[str, List[float]],
        percentiles: Dict[str, float],
        time_labels: List[str],
        title: str = "Monte Carlo Simulation Results"
    ) -> Dict[str, Any]:
        """
        Generate chart specifically for Monte Carlo simulation results

        Args:
            paths: Dictionary with 'best', 'worst', 'median' paths
            percentiles: Dictionary with percentile outcomes
            time_labels: Labels for time axis

        Returns:
            Chart specification for Monte Carlo visualization
        """
        series = [
            {
                'name': 'Best Case (95th percentile)',
                'data': paths.get('best', []),
                'color': '#10b981',
                'dashStyle': 'dash'
            },
            {
                'name': 'Median Outcome',
                'data': paths.get('median', []),
                'color': '#3b82f6',
                'lineWidth': 3
            },
            {
                'name': 'Worst Case (5th percentile)',
                'data': paths.get('worst', []),
                'color': '#ef4444',
                'dashStyle': 'dash'
            }
        ]

        return {
            'type': 'chart',
            'chart_type': 'monte_carlo',
            'config': {
                'title': title,
                'subtitle': 'Probability Distribution of Outcomes',
                'x_axis': {
                    'label': 'Time Period',
                    'data': time_labels
                },
                'y_axis': {
                    'label': 'Portfolio Value',
                    'format': 'currency'
                },
                'series': series,
                'confidence_bands': [
                    {
                        'name': '90% Confidence',
                        'lower': paths.get('p5', []),
                        'upper': paths.get('p95', []),
                        'color': 'rgba(59, 130, 246, 0.1)'
                    },
                    {
                        'name': '50% Confidence',
                        'lower': paths.get('p25', []),
                        'upper': paths.get('p75', []),
                        'color': 'rgba(59, 130, 246, 0.2)'
                    }
                ],
                'options': {
                    'responsive': True,
                    'showConfidenceBands': True,
                    'tooltip': {
                        'shared': True,
                        'crosshairs': True
                    }
                }
            }
        }

    @staticmethod
    def generate_portfolio_allocation_chart(
        allocations: Dict[str, float],
        title: str = "Portfolio Allocation"
    ) -> Dict[str, Any]:
        """
        Generate portfolio allocation donut chart

        Returns:
            Chart specification for portfolio visualization
        """
        data = [{'asset': asset, 'allocation': value * 100} for asset, value in allocations.items()]

        colors = {
            'stocks': '#3b82f6',
            'bonds': '#10b981',
            'real_estate': '#f59e0b',
            'commodities': '#8b5cf6',
            'cash': '#6b7280',
            'crypto': '#ec4899',
            'alternatives': '#14b8a6'
        }

        return {
            'type': 'chart',
            'chart_type': 'donut',
            'config': {
                'title': title,
                'data': {
                    'labels': list(allocations.keys()),
                    'values': [v * 100 for v in allocations.values()],
                    'colors': [colors.get(asset.lower(), '#9ca3af') for asset in allocations.keys()]
                },
                'center_text': 'Portfolio',
                'options': {
                    'responsive': True,
                    'cutout': '60%',
                    'plugins': {
                        'legend': {
                            'position': 'right'
                        },
                        'tooltip': {
                            'callbacks': {
                                'label': 'percentage'
                            }
                        }
                    }
                }
            }
        }

    @staticmethod
    def generate_cash_flow_chart(
        income_data: List[float],
        expense_data: List[float],
        time_labels: List[str],
        title: str = "Cash Flow Analysis"
    ) -> Dict[str, Any]:
        """
        Generate cash flow chart showing income vs expenses

        Returns:
            Chart specification for cash flow visualization
        """
        net_cash_flow = [income - expense for income, expense in zip(income_data, expense_data)]

        return {
            'type': 'chart',
            'chart_type': 'combo',
            'config': {
                'title': title,
                'x_axis': {
                    'label': 'Period',
                    'data': time_labels
                },
                'y_axis': {
                    'label': 'Amount ($)',
                    'format': 'currency'
                },
                'series': [
                    {
                        'name': 'Income',
                        'type': 'bar',
                        'data': income_data,
                        'color': '#10b981'
                    },
                    {
                        'name': 'Expenses',
                        'type': 'bar',
                        'data': expense_data,
                        'color': '#ef4444'
                    },
                    {
                        'name': 'Net Cash Flow',
                        'type': 'line',
                        'data': net_cash_flow,
                        'color': '#3b82f6',
                        'lineWidth': 2
                    }
                ],
                'options': {
                    'responsive': True,
                    'stacked': False,
                    'legend': True
                }
            }
        }

    @staticmethod
    def generate_sparkline(
        data: List[float],
        type: str = "line",
        color: str = "#3b82f6"
    ) -> Dict[str, Any]:
        """
        Generate a small inline sparkline chart

        Returns:
            Sparkline specification
        """
        return {
            'type': 'sparkline',
            'chart_type': type,
            'data': data,
            'color': color,
            'options': {
                'height': 40,
                'width': 120,
                'showTooltip': False,
                'showAxis': False
            }
        }