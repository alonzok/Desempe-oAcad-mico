const BarraProgreso = ({ porcentaje = 0, color = '#1D9E75', altura = 8 }) => {
    const pct = Math.max(0, Math.min(100, porcentaje));
    return (
        <div style={{ background: '#EEEEEE', borderRadius: altura, height: altura, width: '100%', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: altura }} />
        </div>
    );
};

export default BarraProgreso;
