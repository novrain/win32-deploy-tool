/**
 * Created by liuxinyi on 2015/8/19.
 */
var util = {
    MillisecondToDate: function (msd) {
        var time = parseInt(parseInt(msd) / 1000);
        if (null != time && "" != time) {
            if (time > 60 && time < 60 * 60) {
                time = parseInt(time / 60) + "分钟"
                    + (time % 60) + "秒";
            }
            else if (time >= 60 * 60 && time < 60 * 60 * 24) {
                time = parseInt(time / 3600) + "小时"
                    + parseInt(time %  3600 / 60)  + "分钟"
                    + (time % 60) + "秒";
            }
            else if (time >= 60 * 60 * 24) {
                time = parseInt(time / 3600 / 24) + "天"
                        + parseInt(time % (3600 * 24) / 3600)  + "小时"
                        + parseInt(time %  3600 / 60) + "分钟"
                        + (time % 60) + "秒";
            }
            else {
                time = parseInt(time) + "秒";
            }
        }
        return time;
    }
};

module.exports = util;