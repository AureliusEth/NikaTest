'use client';

import { useEffect, useState } from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Area,
	AreaChart,
} from 'recharts';
import { useDarkMode } from './DarkModeProvider';

interface HourlyEarningsData {
	hour: string;
	timestamp: number;
	earnings: number;
}

export default function HourlyEarningsChart() {
	const { isDark } = useDarkMode();
	const [data, setData] = useState<HourlyEarningsData[]>([]);
	const [loading, setLoading] = useState(true);

	// Theme-aware colors
	const getGlassmorphicBg = () => isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.7)';
	const getGlassmorphicBorder = () => isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.3)';
	const getTextColor = () => isDark ? 'rgba(255, 255, 255, 1)' : 'rgba(29, 29, 31, 1)';
	const getTextSecondary = () => isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(134, 134, 139, 1)';
	const getChartColor = () => isDark ? '#a78bfa' : '#5b21b6';
	const getGridColor = () => isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

	useEffect(() => {
		const fetchData = async () => {
			try {
				const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
				const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('x-user-id') : '';
				
				const response = await fetch(`${baseUrl}/api/referral/hourly-earnings`, {
					headers: { 'x-user-id': currentUserId || '' },
					credentials: 'include',
				});

				if (response.ok) {
					const result = await response.json();
					setData(result);
				}
			} catch (error) {
				console.error('Failed to fetch hourly earnings:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	// Format data for chart (show hour labels)
	const chartData = data.map((item) => {
		const date = new Date(item.hour);
		const hour = date.getHours();
		const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
		return {
			...item,
			hourLabel,
			hour,
		};
	});

	const maxEarnings = Math.max(...chartData.map((d) => d.earnings), 0);

	// Custom tooltip
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload.length) {
			// Get the actual data object from the payload
			// All payload entries share the same payload.data object, so we can use any of them
			const data = payload[0]?.payload || {};
			
			// Read earnings directly from the data object (this is the source of truth)
			const earningsValue = data.earnings ?? 0;
			
			// Use label prop if available, otherwise fall back to data.hourLabel
			const hourLabel = label || data.hourLabel || (data.hour !== undefined ? `${data.hour.toString().padStart(2, '0')}:00` : 'N/A');
			
			const tooltipBg = isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
			return (
				<div
					style={{
						background: tooltipBg,
						backdropFilter: 'blur(10px)',
						border: `1px solid ${getGlassmorphicBorder()}`,
						borderRadius: '8px',
						padding: '12px',
						boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
					}}
				>
					<p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: getTextColor(), marginBottom: '4px' }}>
						{hourLabel}
					</p>
					<p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: getChartColor() }}>
						{Number(earningsValue).toFixed(2)} XP
					</p>
				</div>
			);
		}
		return null;
	};

	if (loading) {
		return (
			<div
				style={{
					background: getGlassmorphicBg(),
					backdropFilter: 'blur(20px)',
					border: `1px solid ${getGlassmorphicBorder()}`,
					borderRadius: '16px',
					padding: '32px',
					marginBottom: '32px',
					boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
				}}
			>
				<div style={{ textAlign: 'center', padding: '40px 0' }}>
					<div
						style={{
							display: 'inline-block',
							width: '32px',
							height: '32px',
							borderWidth: '3px',
							borderStyle: 'solid',
							borderColor: getChartColor(),
							borderRightColor: 'transparent',
							borderRadius: '50%',
							animation: 'spin 1s linear infinite',
						}}
					></div>
					<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
					<p style={{ marginTop: '12px', color: getTextSecondary(), fontSize: '14px' }}>Loading chart...</p>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				background: getGlassmorphicBg(),
				backdropFilter: 'blur(20px)',
				border: `1px solid ${getGlassmorphicBorder()}`,
				borderRadius: '16px',
				padding: '32px',
				marginBottom: '32px',
				boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
			}}
		>
			<div style={{ marginBottom: '24px' }}>
				<h2
					style={{
						fontSize: '24px',
						fontWeight: 700,
						color: getTextColor(),
						margin: 0,
						marginBottom: '4px',
					}}
				>
					XP Earnings by Hour
				</h2>
				<p style={{ fontSize: '14px', color: getTextSecondary(), margin: 0 }}>
					Last 24 hours • Total: {data.reduce((sum, d) => sum + d.earnings, 0).toFixed(2)} XP
				</p>
			</div>

			<ResponsiveContainer width="100%" height={300}>
				<AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
					<defs>
						<linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor={getChartColor()} stopOpacity={0.3} />
							<stop offset="95%" stopColor={getChartColor()} stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke={getGridColor()} />
					<XAxis
						dataKey="hourLabel"
						stroke={getTextSecondary()}
						style={{ fontSize: '12px' }}
						tick={{ fill: getTextSecondary() }}
						interval="preserveStartEnd"
					/>
					<YAxis
						stroke={getTextSecondary()}
						style={{ fontSize: '12px' }}
						tick={{ fill: getTextSecondary() }}
						domain={[0, maxEarnings * 1.1 || 100]}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Area
						type="monotone"
						dataKey="earnings"
						stroke="none"
						fill="url(#earningsGradient)"
						isAnimationActive={false}
						activeDot={false}
					/>
					<Line
						type="monotone"
						dataKey="earnings"
						stroke={getChartColor()}
						strokeWidth={2}
						dot={false}
						activeDot={{ 
							r: 6, 
							fill: getChartColor(), 
							stroke: getChartColor(), 
							strokeWidth: 2, 
							strokeOpacity: 0.8,
							style: { cursor: 'pointer' }
						}}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

