/**
 * Created by liuxinyi on 2015/8/6.
 */
var React = require('react');
var Navigation = require('react-router').Navigation;
var Project = require('./Project');
var ApiCaller = require('../utils/ApiCaller');
var WebSocket = require('ws');
require('sweetalert/dist/sweetalert.css');
var swal = require('sweetalert');
var version = require('../version.json');

module.exports = React.createClass({
    mixins: [Navigation],
    getInitialState: function() {
        return {keyword: '', data: null, msg: "项目信息读取中...", watching: undefined};
    },
    handleSysUpdate: function() {
        this.transitionTo('/upgrade/-2');
    },
    handleInstall: function () {
        this.transitionTo('/upgrade/-1');
    },
    handleSwitchWatch: function () {
        var self = this;
        swal({
            title: "是否【" + (!this.state.watching ? "开启" : "关闭") + "】状态监控?",
            text: "",
            type: "warning",
            showCancelButton: true,
            cancelButtonText: 'no',
            confirmButtonColor: "#ffc66d",
            confirmButtonText: "go!",
            showLoaderOnConfirm: true,
            closeOnConfirm: false
        }, function () {
            ApiCaller.post(ApiCaller.API.PROJECT_WATCH_SWITCH, {})
                .then(function (d) {
                    var icon = d.result ? "success" : "error",
                        msg = d.result ? '状态监控' + (!self.state.watching ? "已开启" : "已关闭") : '状态监控无法启动或关闭, 全局监控未启用或存在异常';
                    self.state.watching = d.result ? !self.state.watching : self.state.watching;
                    swal(msg, '', icon);
                    self.getProjectWatchState();
                });
        });
    },
    handleSearch: function(){
        this.setState({keyword: event.target.value.trim()});
    },
    handleSearchSubmit: function(){
        this.setState({keyword: event.target[0].value.trim()});
        return false;
    },
    handleStartAll: function () {
        var self = this;
        swal({
            title: "是否启动全部进程?",
            text: "",
            type: "warning",
            showCancelButton: true,
            cancelButtonText: 'no',
            confirmButtonColor: "#ffc66d",
            confirmButtonText: "go!",
            showLoaderOnConfirm: true,
            closeOnConfirm: false
        }, function () {
            ApiCaller.post(ApiCaller.API.PROJECT_START_ALL)
                .then(function (d) {
                    var icon = d.result === true ? "success" : "error";
                    var txt = d.result === true ? "启动成功" : "启动失败";
                    swal(txt, '', icon);
                });
        });
    },
    handleStopAll: function () {
        var self = this;
        swal({
            title: "是否停止全部进程?",
            text: "",
            type: "warning",
            showCancelButton: true,
            cancelButtonText: 'no',
            confirmButtonColor: "#ffc66d",
            confirmButtonText: "go!",
            showLoaderOnConfirm: true,
            closeOnConfirm: false
        }, function () {
            ApiCaller.post(ApiCaller.API.PROJECT_STOP_ALL)
                .then(function (d) {
                    var icon = d.result === true ? "success" : "error";
                    var txt = d.result === true ? "停止成功" : "停止失败";
                    swal(txt, '', icon);
                });
        });
    },
    getProjectWatchState : function () {
        var self = this;
        ApiCaller.get(ApiCaller.API.PROJECT_WATCH_STATE)
            .then(function (d) {
                self.setState({watching: d.result});
            });
    },
    componentDidMount: function () {
        this.getProjectWatchState();
        var ws = new WebSocket(ApiCaller.API.PROCESSES_STATUS);
        ws.onmessage = function (e) {
            var data = JSON.parse(e.data);
            this.setState({data: data});
        }.bind(this);
        ws.onclose = function () {
            this.setState({data: null, msg: "连接已飞,F5试试.."});
        }.bind(this);
    },
    renderStartStopAll: function() {
        if(this.state.watching){
            return '';
        }

        return (
            <p style={{textAlign: 'center', marginTop: 20}}>
                <button onClick={this.handleStartAll} className="btn ghost-btn">全部启动</button>/
                <button onClick={this.handleStopAll} className="btn ghost-btn">全部停止</button>
            </p>
        );
    },
    render: function () {
        var self = this;
        var content = '';
        if (this.state.data == null) {
            content = (<h3 style={{textAlign: 'center'}}><img src="images/tips.png"/><span className="text-yellow">{this.state.msg}</span></h3>);
        } else if (this.state.data.length === 0) {
            content = (<h3 style={{textAlign: 'center'}}><span className="text-yellow">暂无项目,请安装新项目</span></h3>);
        } else{
            content = this.state.data.map(function(p){
                return (<Project id={p.id} name={p.name} process={p.process} webserver={p.webserver} version={p.version}
                                 updateable={p.updatable} watching={self.state.watching} filter={self.state.keyword} />)
            });
        }

        var watching = '';
        if(this.state.watching === undefined) {
            watching = (<small>加载中..</small>);
        } else if(this.state.watching === true){
            watching = (<button className="btn btn-success" onClick={this.handleSwitchWatch}>已监控状态</button>);
        } else {
            watching = (<button className="btn btn-danger" onClick={this.handleSwitchWatch}>未监控状态</button>);
        }

        return (
            <div>
                <div className="col-md-3 text-center hidden-sm hidden-xs" style={{position: 'fixed'}}>
                    <img src="images/logo.png" className="img-responsive" alt="logo"/>
                    <form className="form-inline" onSubmit={this.handleSearchSubmit}>
                        <div className="form-group">
                            <input type="text" className="form-control" placeholder="试试搜索 -e" onChange={this.handleSearch} />
                        </div>
                    </form>
                    <p style={{textAlign: 'center', marginTop: 40}}><button className="btn ghost-btn" onClick={this.handleInstall}>安装新项目</button></p>
                    <p style={{textAlign: 'center', marginTop: 20}}>{watching}</p>
                    {this.renderStartStopAll()}
                    <div style={{marginTop: 100}}>
                        <p><a href="/login" style={{color: '#ffc66d'}}>登录</a></p>
                        <p><a href="javascript:void(0);" style={{color: '#ffc66d'}} onClick={this.handleSysUpdate}>小护士-自我升级</a></p>
                        <p>{`revision: ${version.revision} / date:${version.datetime}`}</p>
                    </div>
                </div>
                <div className="col-md-3">&nbsp;</div>
                <div className="col-md-8">
                    {content}
                </div>
            </div>
        )
    }
});