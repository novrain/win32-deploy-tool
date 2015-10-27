/**
 * Created by liuxinyi on 2015/9/1.
 */
var React = require('react');
var Navigation = require('react-router').Navigation;
var Link = require('react-router').Link;
require('sweetalert/dist/sweetalert.css');
var swal = require('sweetalert');
var ApiCaller = require('../utils/ApiCaller');
var TimeUtil = require('../utils/TimeUtil');
var PerfChart = require('./PerfChart');

var dataStyle = {
    fontSize: 24
};

module.exports = React.createClass({
    mixins: [Navigation],
    handleStartStop: function () {
        var text = this.props.info.status === "Started" ? "停止" : "启动";
        var self = this;
        swal({
            title: "是否" + text + this.props.info.name + "?",
            text: "",
            type: "warning",
            showCancelButton: true,
            cancelButtonText: 'no',
            confirmButtonColor: "#ffc66d",
            confirmButtonText: "go!",
            showLoaderOnConfirm: true,
            closeOnConfirm: false
        }, function () {
            ApiCaller.post(ApiCaller.API.WEBSERVER_TOGGLE, {
                pjid: self.props.projectId,
                id: self.props.info.id,
                cmd: self.props.info.status === "Started" ? 0 : 1
            })
                .then(function (d) {
                    var icon = d.res === true ? "success" : "error";
                    swal(d.msg, '', icon);
                });
        });
    },
    handlePatch: function () {
        //swal('请先登录','','info');
        this.transitionTo('/process/' + this.props.info.id);
    },
    render: function () {
        var btnToggle;
        var titleClass;
        var status;
        if (this.props.info.status === "Started") {
            btnToggle = <button className="btn ghost-btn" onClick={this.handleStartStop}>停止</button>;
            titleClass = 'text-success';
            status = (
                <h4 calssName="text-success">运行中</h4>
            );
        } else {
            btnToggle = <button className="btn ghost-btn" onClick={this.handleStartStop}>启动</button>;
            titleClass = 'text-danger';
            status = (
                <h4 calssName="text-yellow">未启动</h4>
            );
        }

        var logVeiw = '';
        if (this.props.info.logfile && this.props.info.logfile !== '') {
            var url = '/log/' + this.props.info.logfile;
            logVeiw = <Link className="btn ghost-btn" to={url}>日志</Link>
        }

        var icon = '';
        if(this.props.info.watch === true){
            icon = <i className="glyphicon glyphicon-eye-open" title="已监控"></i>;
        } else {
            icon = <i className="glyphicon glyphicon-eye-close" title="未监控"></i>;
        }

        return (
            <div>
                <div className="col-md-4" style={{padding: 0}}>
                    <div style={{ backgroundColor: '#313335', padding: '5px', margin: '5px'}}>
                        <h3 className={titleClass}>{this.props.info.name}<small style={{paddingLeft: 20}}>{icon}</small></h3>

                        <div style={{lineHeight: '32px'}}>
                            <div>{this.props.info.protocol}://{this.props.info.host}:{this.props.info.port}</div>
                            <div>{this.props.info.path}</div>
                        </div>

                        <div>{status}</div>

                        <p style={{textAlign: 'right'}}>
                            {btnToggle}
                            {logVeiw}
                        </p>
                    </div>
                </div>
            </div>
        )
    }
});