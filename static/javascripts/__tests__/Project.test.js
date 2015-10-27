/**
 * Created by liuxinyi on 2015/8/10.
 */
var React = require('react/addons');
var Project = require('../src/components/Project.js');
var TestUtils = React.addons.TestUtils;

describe('component:Project', function() {
    it('display name through props', function(){
        var dom = TestUtils.renderIntoDocument(
            <Project name="test" />
        );

        var tip = TestUtils.findRenderedDOMComponentWithClass(dom, 'page-header');

        expect(tip.getDOMNode().getElementsByTagName('span')[0].innerText).toEqual('test');
    });

    it('display tips when inited', function() {
        var dom = TestUtils.renderIntoDocument(
            <Project />
        );

        var title = TestUtils.findRenderedDOMComponentWithClass(dom, 'text-yellow');

        expect(title.getDOMNode().textContent).toEqual('进程信息读取中..');

    });
});