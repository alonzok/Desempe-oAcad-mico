const AnilloProgreso = ({
    porcentaje = 0,
    valor = null,
    tamano = 90,
    grosor = 6,
    etiqueta = '',
    color = '#1D9E75'
}) => {
    const r = (tamano - grosor) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, porcentaje));
    const offset = c * (1 - pct / 100);
    const centro = valor != null ? String(valor) : `${Math.round(pct)}%`;
    return (
        <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`}>
            <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="#ECECEC" strokeWidth={grosor} />
            <circle
                cx={tamano / 2}
                cy={tamano / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={grosor}
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
            />
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: tamano * 0.24, fontWeight: 700, fill: '#2A2A2A' }}>
                {centro}
            </text>
            {etiqueta ? (
                <text x="50%" y="64%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: tamano * 0.1, fill: '#6E6E6E' }}>
                    {etiqueta}
                </text>
            ) : null}
        </svg>
    );
};

export default AnilloProgreso;
