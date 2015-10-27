/**
 * Created by liuxinyi on 2015/8/10.
 */
var React = require('react');
var Link = require('react-router').Link;

module.exports = React.createClass({
    render: function(){
        return (
            <h3 style={{padding: '200px'}} className="text-center">
                <img src="images/tips.png"/>
                <span className="text-yellow">页面灰走了~~</span>
                <br/>
                <small><Link to="/" className="btn btn-link">返回首页</Link></small>
            </h3>
        )
    }
});