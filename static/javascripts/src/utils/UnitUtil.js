/**
 * Created by liuxinyi on 2015/9/1.
 */
var util = {
    Convert1024: function (d) {
        if (null != d && "" != d) {
            var data = parseInt(d);
            if (data > 1024 && data < 1024 * 1024) {
                data = (data / 1024.0).toFixed(2) + "MB";
            }
            else if (data >= 1024 * 1024) {
                data = (data / 1024.0 / 1024.0).toFixed(2) + "GB";
            }
            else {
                data = data + "KB";
            }

            return data;
        }else{
            return d;
        }
    }
};

module.exports = util;