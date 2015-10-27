/**
 * Created by liuxinyi on 2015/8/18.
 */
var React = require('react');
var Link = require('react-router').Link;
var State = require('react-router').State;
var WebSocket = require('ws');
var swal = require('sweetalert');
var ApiCaller = require('../utils/ApiCaller');
var FileUpload = require('./Upgrade/FileUpload');

var UpgradeState = {
    "Unknown": -1,
    "Preparing": 0,
    "Upgrading": 1,
    "Upgraded": 2,
    "Failed": 3
};

function getLogStyle(level, logLevel) {
    var style = {paddingLeft: 0, color: '#BBBBBB'};

    while (level > 0) {
        style.paddingLeft = style.paddingLeft + 20;
        level = level - 1;
    }

    switch (logLevel) {
        case 'error':
            style.color = '#A93F41';
            break;
        case 'warn':
            style.color = '#ffc66d';
            break;
    }

    return style;
}

var ws;

module.exports = React.createClass({
    mixins: [State],
    getInitialState: function () {
        return {status: UpgradeState.Unknown, log: [], operation: ''};
    },
    getStatus: function () {
        var self = this;
        ApiCaller.get(ApiCaller.API.UPGRADE_STATE)
            .then(function (data) {
                if (!data.isUpdating) {
                    self.setState({status: UpgradeState.Preparing});
                } else {
                    var l = self.state.log;
                    l.push({
                        msg: '已有' + self.state.operation + '过程在进行中..',
                        time: new Date(),
                        level: 0,
                        logLevel: 'warn'
                    });
                    self.setState({log: l});
                    self.setState({status: UpgradeState.Upgrading});
                }
            });
    },
    onlog: function (value) {
        if (value.data === '~!@#$over') {
            this.setState({status: UpgradeState.Upgraded});
        } else if (value.data === '~!@#$error') {
            this.setState({status: UpgradeState.Failed});
        } else {
            var d = this.state.log;
            var arr = JSON.parse(value.data);
            var r = d.concat(arr);
            this.setState({log: r});
        }
    },
    onUploaded: function (res) {
        if (res) {
            this.setState({status: UpgradeState.Upgrading});
        } else {
            swal(this.state.operation + '预处理失败', res.msg, 'error');
            this.getStatus();
        }
    },
    componentWillMount: function () {
        if (this.props.params.pjid === '-1') {
            this.setState({operation: '安装', status: UpgradeState.Preparing});
        } else {
            this.setState({operation: '升级'});
        }
    },
    componentDidMount: function () {
        this.getStatus();
        ws = new WebSocket(ApiCaller.API.UPGRADE_LOG);
        ws.onmessage = this.onlog.bind(this);
    },
    componentDidUpdate: function () {
        document.body.scrollTop = document.body.scrollHeight;
    },
    render: function () {
        var content;
        var footBack;
        var result = "结束";
        var className = "text-yellow";
        switch (this.state.status) {
            case UpgradeState.Failed:
                result = "失败";
                className = "text-error";
                break;
        }
        switch (this.state.status) {
            case UpgradeState.Unknown:
                content = (
                    <h3 style={{padding: '50px 150px'}}>
                        <img src="images/tips.png"/>
                        <span
                            className="text-yellow">正在努力查询状态..</span>
                    </h3>
                );
                break;
            case UpgradeState.Preparing:
                content = (
                    <div>
                        <h3 style={{marginBottom: 150}}>上传{this.state.operation}包</h3>
                        <FileUpload pjid={this.props.params.pjid} onUploaded={this.onUploaded} />
                    </div>
                );
                break;
            case UpgradeState.Upgrading:
            case UpgradeState.Upgraded:
            case UpgradeState.Failed:
                var logs = this.state.log.map(function (l) {
                    return (<p style={getLogStyle(l.level, l.logLevel)}>{l.msg} - {l.time}</p>)
                });
                var rslt = (<p>
                    <img src="images/loading.gif" className="img-responsive" alt="ing.." />
                </p>);
                if (this.state.status === UpgradeState.Upgraded || this.state.status === UpgradeState.Failed) {
                    rslt = (<h3 className={className}>{this.state.operation}，{result}.</h3>);
                    footBack = (
                        <div className="row">
                            <Link style={{float: 'right', marginBottom: 30}} className="btn ghost-btn" to="/">返回</Link>
                        </div>
                    );
                }
                content = (
                    <div>
                        <h3 style={{marginBottom: 50}}>{this.state.operation}，开始！</h3>
                        {logs}
                        {rslt}
                    </div>
                );
                break;
        }

        return (
            <div className="container">
                <div className="row">
                    <Link style={{float: 'right', marginTop: 30}} className="btn ghost-btn" to="/">返回</Link>
                </div>
                <div style={{marginTop: 50}}>
                    {content}
                </div>
                {footBack}
            </div>
        )
    }
});