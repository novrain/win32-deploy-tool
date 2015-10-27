/**
 * Created by liuxinyi on 2015/8/6.
 */
var React = require('react');
var Navigation = require('react-router').Navigation;
var swal = require('sweetalert');
var Process = require('./Process');
var WebServer = require('./WebServer');
var ApiCaller = require('../utils/ApiCaller');

module.exports = React.createClass({
    mixins: [Navigation],
    handleUpgrade: function () {
        this.transitionTo('/upgrade/' + this.props.id);
    },
    handleRemove: function () {
        var self = this;
        swal({
            title: "是否移除项目:" + this.props.name + "?",
            text: "",
            type: "warning",
            showCancelButton: true,
            cancelButtonText: 'no',
            confirmButtonColor: "#ffc66d",
            confirmButtonText: "go!",
            showLoaderOnConfirm: true,
            closeOnConfirm: false
        }, function () {
            ApiCaller.delete(ApiCaller.API.PROJECT_REMOVE + '/' + self.props.id)
                .then(function (d) {
                    var icon = d.result === true ? "success" : "error";
                    var txt = d.result === true ? "移除成功" : "移除失败";
                    swal(txt, '', icon);
                });
        });
    },
    render: function () {
        var self = this;
        var processList;
        var webserverList;
        var kw = this.props.filter;
        if (kw === '-e') {
            processList = this.props.process.map(function (i) {
                if (i.r[0].status !== 1) {
                    return <Process projectId={self.props.id} info={i}/>
                }
            });

            webserverList = this.props.webserver.map(function (i) {
                if (i.status !== 'Started') {
                    return <WebServer projectId={self.props.id} info={i}/>
                }
            });
        } else {
            processList = this.props.process.map(function (i) {
                if (kw === '' || i.name.toLowerCase().indexOf(kw.toLowerCase()) !== -1) {
                    return <Process projectId={self.props.id} info={i}/>
                }
            });

            webserverList = this.props.webserver.map(function (i) {
                if (kw === '' || i.name.toLowerCase().indexOf(kw.toLowerCase()) !== -1) {
                    return <WebServer projectId={self.props.id} info={i}/>
                }
            });
        }

        var btnUpgrade = '';
        if (this.props.updateable) {
            btnUpgrade = (<button onClick={this.handleUpgrade} className="btn ghost-btn">升级</button>);
        }

        return (
            <div className="bg-default">
                <div className="page-header" style={{margin: '40px 0 5px', paddingBottom: 0}}>
                    <h3>{this.props.name}</h3>

                    <p style={{textAlign: 'right',margin: '0'}}>
                        {btnUpgrade}
                        <button onClick={this.handleRemove} className="btn ghost-btn">移除</button>
                    </p>
                </div>
                <div className="row" style={{marginRight: 0, marginLeft: 0}}>
                    {webserverList}
                </div>
                <div className="row" style={{marginRight: 0, marginLeft: 0}}>
                    {processList}
                </div>
            </div>
        )
    }
});