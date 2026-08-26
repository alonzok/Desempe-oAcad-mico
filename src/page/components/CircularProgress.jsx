import { makeStyles } from '@ellucian/react-design-system/core';

const useStyles = makeStyles()(() => ({
    circularProgress: {
        position: 'relative',
        width: '70px',
        height: '70px',
    },
    circularSvg: {
        transform: 'rotate(-90deg)',
    },
    circularText: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
    },
    circularPercent: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#333',
    },
    circularLabel: {
        fontSize: '8px',
        color: '#888',
        display: 'block',
    },
}));

const CircularProgress = ({ percentage, size = 70, strokeWidth = 6 }) => {
    const { classes } = useStyles();
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className={classes.circularProgress} style={{ width: size, height: size }}>
            <svg width={size} height={size} className={classes.circularSvg}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#e8e8e8"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#fdd835"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className={classes.circularText}>
                <span className={classes.circularPercent}>{percentage}%</span>
                <span className={classes.circularLabel}>Avance</span>
            </div>
        </div>
    );
};

export default CircularProgress;
