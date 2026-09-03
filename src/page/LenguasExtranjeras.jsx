import PropTypes from 'prop-types';
import {
    User as UserIcon,
    Id as IdIcon,
    CalendarGrid as CalendarIcon,
    Info as InfoIcon
} from '@ellucian/ds-icons/lib';
import { Card, Button } from '@ellucian/react-design-system/core';
import { generarKardexPdf } from './generarKardexPdf';
import { LOGO_CEE, MAPA_TIERRA, MAPA_GRID } from './lenguasAssets';

// ──────────────────────────────────────────────────────────────────────
// Datos / config
// ──────────────────────────────────────────────────────────────────────
const ACENTO = '#4F46E5';
const SUBTITULO = 'Centro de Educación Continua UABC';

const COLORES = {
    verde: { bg: '#DCFCE7', fg: '#15803D' },
    azul: { bg: '#DBEAFE', fg: '#1D4ED8' },
    ambar: { bg: '#FEF3C7', fg: '#B45309' },
    purpura: { bg: '#EDE9FE', fg: '#6D28D9' },
    rojo: { bg: '#FEE2E2', fg: '#B91C1C' },
    gris: { bg: '#EEEEEE', fg: '#555555' }
};

const IDIOMAS = [
    { key: 'aleman', match: ['alem'], nombre: 'Alemán', pais: 'DE' },
    { key: 'chino', match: ['chino', 'mandar'], nombre: 'Chino mandarín', pais: 'CN' },
    { key: 'coreano', match: ['corea'], nombre: 'Coreano', pais: 'KR' },
    { key: 'espanol', match: ['españ', 'espanol', 'espa'], nombre: 'Español', pais: 'ES' },
    { key: 'frances', match: ['franc'], nombre: 'Francés', pais: 'FR' },
    { key: 'ingles', match: ['ingl'], nombre: 'Inglés', pais: 'US' },
    { key: 'italiano', match: ['italian'], nombre: 'Italiano', pais: 'IT' },
    { key: 'japones', match: ['japon'], nombre: 'Japonés', pais: 'JP' },
    { key: 'portugues', match: ['portug'], nombre: 'Portugués', pais: 'BR' },
    { key: 'ruso', match: ['ruso'], nombre: 'Ruso', pais: 'RU' }
];






// ── Helpers ──
function detectarIdioma(nombreCurso) {
    const s = String(nombreCurso || '').toLowerCase();
    return IDIOMAS.find((i) => i.match.some((m) => s.includes(m)))
        || { key: null, nombre: nombreCurso || 'Idioma', pais: null };
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtFecha(d) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + MESES[d.getMonth()] + '/' + d.getFullYear();
}
function periodoLegible(cod) {
    const m = String(cod || '').match(/^(\d{4})(\d{2})$/);
    if (!m) return String(cod || '');
    const ciclo = { '10': '1', '20': '2', '30': '3' }[m[2]] || String(parseInt(m[2], 10));
    return m[1] + '-' + ciclo;
}
function agruparCursos(kardex) {
    const orden = [];
    const map = {};
    (kardex || []).forEach((m) => {
        const idi = detectarIdioma(m.nombreMateria);
        const key = idi.key || idi.nombre;
        if (!map[key]) { map[key] = { idioma: idi.nombre, pais: idi.pais, cursos: [] }; orden.push(key); }
        map[key].cursos.push(m);
    });
    return orden.map((k) => {
        const g = map[k];
        g.maxTerm = g.cursos.reduce((a, m) => (m.termino > a ? m.termino : a), '');
        return g;
    });
}
function colorCalif(m, maxTerm) {
    if (m.estado === 'reprobada') return COLORES.rojo;
    if (m.estado === 'en_curso') return COLORES.gris;
    return m.termino === maxTerm ? COLORES.azul : COLORES.verde;
}


// ── Globo con continentes ──
function Globo() {
    return (
        <svg viewBox="0 0 340 240" width="270" height="190" style={{ flexShrink: 0 }} aria-hidden="true">
            <ellipse cx="170" cy="126" rx="118" ry="54" fill="none" stroke="#CBC3F2" strokeWidth="1.6" strokeDasharray="1.5 7" strokeLinecap="round" transform="rotate(-16 170 126)" />
            <circle cx="170" cy="122" r="62" fill="#DED7FA" />
            <clipPath id="globoLE"><circle cx="170" cy="122" r="62" /></clipPath>
            <g clipPath="url(#globoLE)">
                <path d={MAPA_TIERRA} fill="#9E88EC" />
                <path d={MAPA_GRID} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.55" />
                <ellipse cx="142" cy="94" rx="20" ry="12" fill="#ffffff" opacity="0.3" />
            </g>
            <circle cx="170" cy="122" r="62" fill="none" stroke="#B6A8F0" strokeWidth="1.5" />
            <g fontFamily="sans-serif" fontSize="15" fontWeight="500">
                <g><rect x="14" y="24" width="80" height="34" rx="17" fill="#8B7BEA" /><path d="M40,56 l0,12 l13,-11 Z" fill="#8B7BEA" /><text x="54" y="46" fill="#fff" textAnchor="middle">Hello</text></g>
                <g><rect x="240" y="20" width="80" height="34" rx="17" fill="#4C9BE8" /><path d="M300,54 l0,12 l-13,-11 Z" fill="#4C9BE8" /><text x="280" y="42" fill="#fff" textAnchor="middle">Hallo</text></g>
                <g><rect x="2" y="128" width="96" height="34" rx="17" fill="#EC6FA0" /><path d="M40,128 l0,-12 l14,11 Z" fill="#EC6FA0" /><text x="50" y="150" fill="#fff" textAnchor="middle">Bonjour</text></g>
                <g><rect x="244" y="136" width="90" height="34" rx="17" fill="#F0A93E" /><path d="M300,136 l0,-12 l-14,11 Z" fill="#F0A93E" /><text x="289" y="158" fill="#fff" textAnchor="middle">¡Hola!</text></g>
                <g><rect x="132" y="196" width="76" height="34" rx="17" fill="#4FB477" /><path d="M158,196 l0,-12 l14,11 Z" fill="#4FB477" /><text x="170" y="218" fill="#fff" textAnchor="middle">你好</text></g>
            </g>
        </svg>
    );
}

function CheckIcon() {
    return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -3, marginRight: 3 }} aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></svg>);
}

function LogoCEE() {
    return (<img src={LOGO_CEE} alt="Centro de Educación Continua UABC" style={{ height: 50, width: 'auto', display: 'block' }} />);
}

function InfoItem({ icon, label, valor, primera }) {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 16px', borderLeft: primera ? 'none' : '0.5px solid #ECECEC' }}>
            <span style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: ACENTO }}>
                <span style={{ display: 'inline-flex', transform: 'scale(1.55)' }}>{icon}</span>
            </span>
            <div>
                <div style={{ fontSize: 12, color: '#6E6E6E' }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{valor}</div>
            </div>
        </div>
    );
}
InfoItem.propTypes = { icon: PropTypes.node, label: PropTypes.string, valor: PropTypes.node, primera: PropTypes.bool };

const sectionBox = { border: '0.5px solid #E6E6E6', borderRadius: 12, overflow: 'hidden', marginTop: 16 };
const sectionHead = { padding: '12px 18px', background: '#F5F4FB', borderBottom: '0.5px solid #ECECEC' };
const thL = { textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: ACENTO };
const thC = { textAlign: 'center', padding: '10px 14px', fontSize: 12, fontWeight: 600, color: ACENTO };
const tdL = { textAlign: 'left', padding: '13px 14px', fontSize: 13, borderTop: '0.5px solid #F0F0F0' };
const tdC = { textAlign: 'center', padding: '13px 14px', fontSize: 13, borderTop: '0.5px solid #F0F0F0' };

function Estatus({ estado }) {
    if (estado === 'aprobada') return <span style={{ color: '#15803D', fontWeight: 500 }}><CheckIcon />Aprobado</span>;
    if (estado === 'reprobada') return <span style={{ color: '#C0392B', fontWeight: 500 }}>Reprobado</span>;
    return <span style={{ color: '#6E6E6E' }}>En curso</span>;
}
Estatus.propTypes = { estado: PropTypes.string };

function TablaCursos({ grupo }) {
    return (
        <div style={sectionBox}>
            <div style={sectionHead}>
                <span style={{ fontWeight: 600, color: '#2E2A63', fontSize: 15 }}>Lengua Extranjera: {grupo.idioma}</span>
                <span style={{ color: '#6E6E6E', marginLeft: 6, fontSize: 14 }}>(Cursos)</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th style={{ ...thL, paddingLeft: 20, width: '40%' }}>Curso</th>
                        <th style={{ ...thC, width: '20%' }}>Periodo</th>
                        <th style={{ ...thC, width: '20%' }}>Calificación</th>
                        <th style={{ ...thL, paddingLeft: 24, width: '20%' }}>Estatus</th>
                    </tr>
                </thead>
                <tbody>
                    {grupo.cursos.map((m) => {
                        const cc = colorCalif(m, grupo.maxTerm);
                        return (
                            <tr key={m.claveMateria + m.termino}>
                                <td style={{ ...tdL, paddingLeft: 20, fontWeight: 600 }}>{m.nombreMateria}</td>
                                <td style={tdC}>{periodoLegible(m.termino)}</td>
                                <td style={tdC}><span style={{ background: cc.bg, color: cc.fg, borderRadius: 8, padding: '3px 13px', fontWeight: 600 }}>{m.calificacion == null ? '—' : m.calificacion}</span></td>
                                <td style={{ ...tdL, paddingLeft: 24 }}><Estatus estado={m.estado} /></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
TablaCursos.propTypes = { grupo: PropTypes.object.isRequired };


function LenguasExtranjeras({ programa }) {
    const est = programa.estudiante || {};
    const grupos = agruparCursos(programa.kardex);
    return (
        <Card>
            <div style={{ padding: '1.5rem' }}>
                {/* Encabezado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <LogoCEE />
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#22224A' }}>Lenguas Extranjeras</div>
                            <div style={{ fontSize: 15, color: ACENTO, fontWeight: 600 }}>{SUBTITULO}</div>
                        </div>
                    </div>
                    <Globo />
                </div>

                {/* Barra de información */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 20, background: '#F7F7FB', borderRadius: 12, padding: '14px 4px' }}>
                    <InfoItem primera icon={<UserIcon />} label="Estudiante" valor={est.nombre || '—'} />
                    <InfoItem icon={<IdIcon />} label="Matrícula UABC" valor={est.matricula || '—'} />
                    <InfoItem icon={<CalendarIcon />} label="Fecha de consulta" valor={fmtFecha(new Date())} />
                </div>

                {/* Cursos por idioma */}
                {grupos.map((g) => (<TablaCursos key={g.idioma} grupo={g} />))}


                {/* Pie */}
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#EEF2FF', borderRadius: 12, fontSize: 13, color: '#3F4A8C', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <InfoIcon /> La información presentada proviene de los registros académicos del estudiante en el Centro de Educación Continua UABC.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <Button size="small" onClick={() => generarKardexPdf(programa)}>Descargar kardex (PDF)</Button>
                </div>
            </div>
        </Card>
    );
}
LenguasExtranjeras.propTypes = { programa: PropTypes.object.isRequired };

export default LenguasExtranjeras;
