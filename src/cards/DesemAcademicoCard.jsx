import { spacing40 } from '@ellucian/react-design-system/core/styles/tokens';
import { makeStyles, Typography, TextLink } from '@ellucian/react-design-system/core';

const useStyles = makeStyles()({
    card: {
        margin: `0 ${spacing40}`,
    }
});

const DesemAcademicoCard = () => {
    const { classes } = useStyles();

    return (
        <div className={classes.card}>
            <Typography variant="h2">
                Hello DesemAcademico World
            </Typography>
            <Typography>
                <span>
                    For sample extensions, visit the Ellucian Developer
                </span>
                <TextLink href="https://github.com/ellucian-developer/experience-extension-sdk-samples" target="_blank">
                     GitHub
                </TextLink>
            </Typography>
        </div>
    );
};

export default DesemAcademicoCard;
