import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OverviewChartProps {
    data: any[];
}

export default function OverviewChart({ data }: OverviewChartProps) {
    return (
        <div style={{ width: '100%', minHeight: 250 }}>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#666' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#666' }} />
                <Tooltip cursor={{ fill: '#fafafa' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 900 }} />
                <Bar dataKey="sales" fill="#18181b" radius={[12, 12, 0, 0]} />
                <Bar dataKey="commission" fill="#ea580c" radius={[12, 12, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
        </div>
    );
}
