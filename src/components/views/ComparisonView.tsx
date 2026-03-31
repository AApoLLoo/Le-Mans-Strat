import React, { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Brush,
    Legend,
} from 'recharts';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// Interfaces
interface LapData {
    distance: number;
    speed: number;
    acceleration: number;
    braking: number;
    rpm: number;
    brakePressure: number;
    throttle: number;
    gear: number;
}

interface Session {
    id: string;
    name: string;
}

interface Lap {
    id: string;
    name: string;
    data: LapData[];
}

interface ComparisonViewProps {
    sessions: Session[];
    laps: Lap[];
}

// Composant principal
const ComparisonView: React.FC<ComparisonViewProps> = ({ sessions, laps }) => {
    const [selectedSession1, setSelectedSession1] = useState<string>('');
    const [selectedSession2, setSelectedSession2] = useState<string>('');
    const [selectedLap1, setSelectedLap1] = useState<string>('');
    const [selectedLap2, setSelectedLap2] = useState<string>('');
    const [selectedMetric, setSelectedMetric] = useState<string>('speed');
    const [showDifferences, setShowDifferences] = useState<boolean>(false);
    const [isComparing, setIsComparing] = useState<boolean>(false);

    // Métriques disponibles
    const metrics = [
        { key: 'speed', label: 'Vitesse (km/h)' },
        { key: 'acceleration', label: 'Accélération (m/s²)' },
        { key: 'braking', label: 'Freinage (m/s²)' },
        { key: 'rpm', label: 'RPM' },
        { key: 'brakePressure', label: 'Pression de frein (bar)' },
        { key: 'throttle', label: 'Accélérateur (%)' },
        { key: 'gear', label: 'Rapport' },
    ];

    const handleCompare = () => {
        if (selectedLap1 && selectedLap2) {
            setIsComparing(true);
        }
    };

    const handleReset = () => {
        setIsComparing(false);
        setSelectedLap1('');
        setSelectedLap2('');
    };

    // Fonction pour récupérer les données d'un lap (à adapter avec votre API)
    const getLapData = (lapId: string): LapData[] => {
        return laps.find(lap => lap.id === lapId)?.data || [];
    };

    const lap1Data = useMemo(() => getLapData(selectedLap1), [selectedLap1]);
    const lap2Data = useMemo(() => getLapData(selectedLap2), [selectedLap2]);

    // Calcul des différences (à adapter selon vos besoins)
    const differences = useMemo(() => {
        if (!lap1Data.length || !lap2Data.length) return [];
        const minLength = Math.min(lap1Data.length, lap2Data.length);
        return lap1Data.slice(0, minLength).map((point, index) => ({
            ...point,
            difference: point[selectedMetric] - lap2Data[index][selectedMetric],
        }));
    }, [lap1Data, lap2Data, selectedMetric]);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>Comparaison de Laps</h2>

            {/* Sélecteurs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold' }}>Session 1 :</label>
                    <select
                        value={selectedSession1}
                        onChange={(e) => {
                            setSelectedSession1(e.target.value);
                            setSelectedLap1('');
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">Sélectionner une session</option>
                        {sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {session.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold' }}>Lap 1 :</label>
                    <select
                        value={selectedLap1}
                        onChange={(e) => setSelectedLap1(e.target.value)}
                        disabled={!selectedSession1}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">Sélectionner un lap</option>
                        {selectedSession1 &&
                            laps
                                .filter((lap) => lap.id.startsWith(selectedSession1))
                                .map((lap) => (
                                    <option key={lap.id} value={lap.id}>
                                        {lap.name}
                                    </option>
                                ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold' }}>Session 2 :</label>
                    <select
                        value={selectedSession2}
                        onChange={(e) => {
                            setSelectedSession2(e.target.value);
                            setSelectedLap2('');
                        }}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">Sélectionner une session</option>
                        {sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {session.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold' }}>Lap 2 :</label>
                    <select
                        value={selectedLap2}
                        onChange={(e) => setSelectedLap2(e.target.value)}
                        disabled={!selectedSession2}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="">Sélectionner un lap</option>
                        {selectedSession2 &&
                            laps
                                .filter((lap) => lap.id.startsWith(selectedSession2))
                                .map((lap) => (
                                    <option key={lap.id} value={lap.id}>
                                        {lap.name}
                                    </option>
                                ))}
                    </select>
                </div>
            </div>

            {/* Choix de la métrique */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Métrique :</label>
                <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    {metrics.map((metric) => (
                        <option key={metric.key} value={metric.key}>
                            {metric.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Options de comparaison */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ marginRight: '15px' }}>
                    <input
                        type="checkbox"
                        checked={showDifferences}
                        onChange={() => setShowDifferences(!showDifferences)}
                    />
                    Afficher les différences
                </label>
                <button
                    onClick={handleCompare}
                    disabled={!selectedLap1 || !selectedLap2}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '10px',
                    }}
                >
                    Comparer
                </button>
                <button
                    onClick={handleReset}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Réinitialiser
                </button>
            </div>

            {/* Affichage des résultats */}
            {isComparing && (
                <div
                    style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: '#f9fafb',
                    }}
                >
                    <h3 style={{ marginBottom: '15px', color: '#111827' }}>
                        Comparaison des laps : {selectedMetric}
                    </h3>
                    <div style={{ height: '500px' }}>
                        <TransformWrapper>
                            <TransformComponent>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={showDifferences ? differences : lap1Data.concat(lap2Data)}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="distance"
                                            label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5 }}
                                        />
                                        <YAxis
                                            label={{
                                                value: metrics.find((m) => m.key === selectedMetric)?.label,
                                                angle: -90,
                                                position: 'insideLeft',
                                            }}
                                        />
                                        <Tooltip />
                                        <Legend />
                                        <Brush dataKey="distance" height={30} stroke="#8884d8" />
                                        {!showDifferences && (
                                            <>
                                                <Line
                                                    type="monotone"
                                                    dataKey={selectedMetric}
                                                    data={lap1Data}
                                                    stroke="#3b82f6"
                                                    name="Lap 1"
                                                    strokeWidth={2}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey={selectedMetric}
                                                    data={lap2Data}
                                                    stroke="#ef4444"
                                                    name="Lap 2"
                                                    strokeWidth={2}
                                                />
                                            </>
                                        )}
                                        {showDifferences && (
                                            <Line
                                                type="monotone"
                                                dataKey="difference"
                                                data={differences}
                                                stroke="#10b981"
                                                name="Différence (Lap1 - Lap2)"
                                                strokeWidth={2}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </TransformComponent>
                        </TransformWrapper>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparisonView;