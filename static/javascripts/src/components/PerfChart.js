/**
 * Created by liuxinyi on 2015/8/20.
 */
var React = require('react');
var sl = require('./SparkLines/index');
var Sparklines = sl.Sparklines;
var SparklinesLine = sl.SparklinesLine;
var SparkLinesBars = sl.SparklinesBars;
var SparklinesSpots = sl.SparklinesSpots;
var SparklinesReferenceLine = sl.SparklinesReferenceLine;

module.exports = React.createClass({
    getInitialState: function(){
        return {data: []};
    },
    componentWillReceiveProps : function(nextProp){
        this.setState({data: this.state.data.concat(nextProp.data)});
    },
    render: function () {
        var content = '';
        if(this.props.type === 'line'){
            content = (<SparklinesLine color="#ffc66d"/>);
        }else if(this.props.type === 'bar'){
            content = (<SparkLinesBars color="#ffc66d"/>);
        }else{
            content = (<SparklinesLine color="#ffc66d" />);
        }

        return (
            <Sparklines data={this.state.data} limit={20}>
                {content}
                <SparklinesSpots style={{ fill: "#BBBBBB" }} />
                <SparklinesReferenceLine type="avg" />
            </Sparklines>
        )
    }
});