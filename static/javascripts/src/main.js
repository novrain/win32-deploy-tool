/**
 * Created by liuxinyi on 2015/8/5.
 */
var React = require('react');
var Router = require('react-router');
var Projects = require('./components/Projects');
var ProjectUpgrade = require('./components/ProjectUpgrade');
var NotFound = require('./components/NotFound');
var LogView = require('./components/LogView');

var Route = Router.Route;
var NotFoundRoute = Router.NotFoundRoute;

var routes = (
    <Route>
        <Route path="/" handler={Projects}/>
        <Route path="upgrade/:pjid" handler={ProjectUpgrade}/>
        <Route path="log/:file" handler={LogView}/>

        <NotFoundRoute handler={NotFound} />
    </Route>
);

Router.run(routes, function(Root) {
    React.render(<Root/>, document.getElementById('main'));
});