/**
 * Created by liuxinyi on 2015/8/18.
 */
var React = require('react');
var Link = require('react-router').Link;
var State = require('react-router').State;
var WebSocket = require('ws');
var ApiCaller = require('../utils/ApiCaller');

module.exports = React.createClass({
    mixins: [State],
    getInitialState: function () {
        return {data: []};
    },
    componentDidMount: function () {
        var ws = new WebSocket(ApiCaller.API.PROCESS_LOG);
        ws.onmessage = function (value) {
            var d = this.state.data;
            d.push(value.data);
            d.push("\r\n");
            this.setState({data: d});
        }.bind(this);
        ws.onopen = function () {
            ws.send(JSON.stringify({'filetotail': this.props.params.file}));
        }.bind(this);
    },
    componentDidUpdate: function () {
        this.refs.log.getDOMNode().scrollTop = this.refs.log.getDOMNode().scrollHeight;
    },
    render: function () {
        var txt = this.state.data.join('');
        return (
            <div className="container">
                <div className="row">
                    <Link style={{float: 'right', marginTop: 30}} className="btn ghost-btn" to="/">返回</Link>
                </div>
                <form style={{marginTop: 50}}>
                    <textarea ref="log" readOnly={true} className="form-control" style={{minHeight: 500}} rows="3" value={txt}></textarea>
                </form>
            </div>
        )
    }
});