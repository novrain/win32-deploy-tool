/**
 * Created by liuxinyi on 2015/8/24.
 */
var React = require('react');
var Dropzone = require('react-dropzone');
var swal = require('sweetalert');
var ApiCaller = require('../../utils/ApiCaller');

var UploadStatus = {
    PreUpload : 0,
    Uploading : 1
};

module.exports = React.createClass({
    getInitialState: function () {
        return {status : UploadStatus.PreUpload};
    },
    onDrop: function(files) {
        var self = this;
        self.setState({status: UploadStatus.Uploading});
        ApiCaller
            .upload(ApiCaller.API.UPLOAD_PACKAGE + '?pjid=' + this.props.pjid, files)
            .then(function(data){
                self.setState({status: UploadStatus.PreUpload});
                self.props.onUploaded(data.res);
            });
    },
    render : function () {
        var content = '';
        switch (this.state.status){
            case UploadStatus.PreUpload:
                content = (
                    <Dropzone onDrop={this.onDrop} width={'100%'} height={200} multiple={false} accept={'application/x-zip-compressed'}>
                        <div style={{textAlign: 'center'}}>拖拽或点击选择要上传的升级包.(只支持zip格式)</div>
                    </Dropzone>
                );
                break;
            case UploadStatus.Uploading:
                content = (
                    <div className="progress">
                        <div className="progress-bar progress-bar-warning progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style={{width:'100%'}}>
                        </div>
                    </div>
                );
                break;
        }

        return (
            <div>
                {content}
            </div>
        );
    }
});