/**
 * Created by liuxinyi on 2015/8/6.
 */
var React = require('react');
var Navigation = require('react-router').Navigation;
var Link = require('react-router').Link;
require('sweetalert/dist/sweetalert.css');
var swal = require('sweetalert');
var ApiCaller = require('../utils/ApiCaller');
var TimeUtil = require('../utils/TimeUtil');
var UnitUtil = require('../utils/UnitUtil');
var PerfChart = require('./PerfChart');

var dataStyle = {
    fontSize: 24
};

module.exports = React.createClass({
    mixins: [Navigation],
    handleStartStop: function () {
        var text = this.props.info.stats.status === 1 ? "停止" : "启动";
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
            ApiCaller.post(ApiCaller.API.PROCESS_TOGGLE, {
                    pjid: self.props.projectId,
                    id: self.props.info.id,
                    cmd: self.props.info.stats.status === 1 ? 0 : 1
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
        var details;
        var time = TimeUtil.MillisecondToDate(this.props.info.stats.uptime);
        var timeSum = TimeUtil.MillisecondToDate(this.props.info.stats.totalUpTime + this.props.info.stats.uptime);

        if (this.props.info.stats.status === 1) {
            btnToggle = <button className="btn ghost-btn" onClick={this.handleStartStop}>停止</button>;
            titleClass = 'text-success';
            status = (
                <div>
                    <p>当前版本运行时长：</p>
                    <p style={dataStyle}>{time}</p>
                </div>
            );
            details = (
                <div>
                    <div>CPU：<span style={dataStyle}>{this.props.info.stats.cpupec}%</span></div>
                    <div><PerfChart type="line" data={this.props.info.stats.cpupec}/></div>
                    <div>MEM：<span
                        style={dataStyle}>{UnitUtil.Convert1024(this.props.info.stats.memory)}({this.props.info.stats.mempec}%)</span>
                    </div>
                    <div><PerfChart type="bar" data={this.props.info.stats.mempec}/></div>
                </div>);
        } else {
            btnToggle = <button className="btn ghost-btn" onClick={this.handleStartStop}>启动</button>;
            titleClass = 'text-danger';
            status = (
                <div style={{minHeight: 186}}>
                    <h4 calssName="text-yellow">未启动</h4>
                </div>
            );
            details = '';
        }

        var logVeiw = '';
        if (this.props.info.logfile && this.props.info.logfile !== '') {
            var url = '/log/' + this.props.info.logfile;
            logVeiw = <Link className="btn ghost-btn" to={url}>日志</Link>
        }

        var icon = '';
        if (this.props.info.watch === true) {
            icon = <i className="glyphicon glyphicon-eye-open" title="已监控"></i>;
        } else {
            icon = <i className="glyphicon glyphicon-eye-close" title="未监控"></i>;
        }

        return (
            <div>
                <div className="col-md-4" style={{padding: 0}}>
                    <div style={{ backgroundColor: '#313335', minHeight:404, padding: '5px', margin: '5px'}}>
                        <h3 className={titleClass}>{this.props.info.name}
                            <small style={{paddingLeft: 20}}>{icon}</small>
                        </h3>

                        <div className="row">
                            <div className="col-lg-12 col-md-12">
                                <div style={{lineHeight: '32px'}}>{this.props.info.path}</div>
                                <p>累计运行时长：</p>
                                <p style={dataStyle}>{timeSum}</p>
                                <div>{status}</div>
                            </div>
                            <div className="col-lg-12 col-md-12">
                                {details}
                            </div>
                        </div>

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