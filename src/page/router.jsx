import {
    BrowserRouter as Router,
    Switch,
    Route
} from 'react-router-dom';
import PropTypes from 'prop-types';
import DesempenoAcademico from './DesempenoAcademico';

const RouterPage = (props) => {
    return (
        <Router basename={props.pageInfo.basePath}>
            <Switch>
                <Route path='/DesempenoAcademico'>
                    <DesempenoAcademico />
                </Route>
                <Route path='/'>
                    <DesempenoAcademico />
                </Route>
            </Switch>
        </Router>
    );
};

RouterPage.propTypes = {
    pageInfo: PropTypes.object
};

export default RouterPage;
