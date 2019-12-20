import 'nodelist-foreach-polyfill';
import "classlist-polyfill";
import 'element-closest-polyfill';

import { Init, d3Remove, makecomma, d3, svgCheck, getDigit, numXnum, svgNotMsg } from '@saramin/ui-d3-helper';
import CLASS from '@saramin/ui-d3-selector';

const LineChart = function(...arg) {
	const plugin = new Init(arg);
	let _this = {},
		targetNodes = _this.targetNodes = Init.setTarget(plugin),
		dataContainer = _this.dataContainer = Init.setData(plugin),
		options = _this.options = Init.setOptions(plugin, {
			w: 838,
			h: 280,
			mTop: 40,
			mRight: 20,
			mBottom: 20,
			mLeft: 40,
			ticks: 7,
			circleR: 3.5,
			dataRangeMin: 0,
			dataRangeMax: 100,
			yAxisX: -8,
			yAxisY: 2,
			focusData: null,
			toolTip: null,
			toolTipLine: false,
			circleExpand: 1.5,
			mode: 'normal',
			tooltipAxisX: 0,
			tooltipReverseAxisX: 0
		}),
		instances = _this.instances = [];

	class Line {
		constructor(el, i) {
			this.el = el;
			this.idx = i;
			this.g = {};
			this.data = dataContainer[this.idx];
			this.reformatData = [];
			this.keys = Object.keys(this.data[0][0]);
			this.yAxisTicks = [];
			this.isoMaxValue = 0;
			this.dataRangeMax = 0;
			this.init();
		}
		init() {
			d3Remove(this.el);
			this.draw();
		}
		dataRender() {
			// data 형태 변환
			this.data[0].forEach((d, i) => this.reformatData[i] = this.keys.map(function(key) { return {x: key, y: d[key]} }) );
			// data min, max 값
			const maxDataArray = this.data[0].reduce((acc, item) => {
				Object.keys(item).forEach(key => acc.push(item[key]));
				return acc;
			}, []);
			let maxValue = Math.max(...maxDataArray);
			this.dataRangeMax = maxValue > options.dataRangeMax ? maxValue : options.dataRangeMax;

			const getDigitNum = numXnum(getDigit(this.dataRangeMax));
			let interMaxValue = Math.round(this.dataRangeMax / getDigitNum) * getDigitNum;

			// Interpolation
			if(interMaxValue > this.dataRangeMax) {
				if(interMaxValue % (options.ticks -1) === 0) this.isoMaxValue = interMaxValue;
			}else if(interMaxValue == this.dataRangeMax) {
				this.isoMaxValue = interMaxValue + ((getDigitNum/10) * (options.ticks -1));
			}else if(interMaxValue < this.dataRangeMax) {
				if(this.dataRangeMax % (options.ticks -1) === 0) {
					this.isoMaxValue = this.dataRangeMax + ((getDigitNum/10) * (options.ticks -1));
				}else {
					this.isoMaxValue = interMaxValue + ((getDigitNum/10) * (options.ticks -1));
				}
			}
		}
		draw() {
			this.dataRender();

			const width = options.w - (options.mRight + options.mLeft),
				height = options.h - (options.mTop + options.mBottom);

			// set the ranges
			const x = d3.scaleBand().range([0, width]).padding(1);
			const y = d3.scaleLinear().range([height, 0]);
			x.domain(this.keys);
			y.domain([options.dataRangeMin, this.dataRangeMax]);


			// svg 생성
			this.g = d3.select(this.el).append('svg')
				.classed(`${CLASS.lineChartClass}`, true)
				.attr('width', width + options.mLeft + options.mLeft)
				.attr('height', height + options.mTop + options.mBottom )
				.attr('viewBox', `0 0 ${width + options.mLeft + options.mLeft} ${height + options.mTop + options.mBottom}`)
				.append('g')
				.attr('transform', 'translate(' + options.mLeft + ',' + options.mTop + ')');

			//yDomain
			for (let i=0;i<options.ticks;i++){
				this.yAxisTicks.push((this.isoMaxValue) / (options.ticks - 1) * i + options.dataRangeMin);
			}
			// Axis 선 만들기

			const xAxis = d3.axisBottom(x);
			const yAxis = d3.axisLeft(y).ticks(options.ticks).tickSize(-width).tickValues(this.yAxisTicks);
			const customXAxis = g => {
				g.call(xAxis);
				g.selectAll('line').remove();
				g.selectAll('text').classed(`${CLASS.lineChartAxisTextX}`,true);
			};
			const customYAxis = g => {
				g.call(yAxis);
				g.selectAll('.tick line')
					.classed('tick_y', true);
				g.selectAll('.tick text')
					.classed('tick_txt', true)
					.attr('x', options.yAxisX)
					.attr('dy', options.yAxisY);
			};


			this.g.append('g')
				.attr('transform', 'translate(0,' + height + ')')
				.classed(`${CLASS.xAxis}`,true)
				.call(customXAxis);

			this.g.append('g')
				.classed(`${CLASS.yAxis}`,true)
				.call(customYAxis);

			const line = d3.line()
				.curve(d3.curveLinear)
				.x(d => x(d.x))
				.y(d => y(d.y));

			const lineG = this.g.append('g')
				.classed(`${CLASS.lineChartLine}`, true)
				.selectAll('g')
				.data(this.reformatData)
				.enter()
				.append('g')
				.append('path')
				.attr('class', (d, i) => `${CLASS.lineChartPath} ${CLASS.lineChartPath}`+ (i+1))
				.attr('d', line);


			const dotG = this.g.selectAll(`${CLASS.lineChartWrapDot}`)
				.data(this.reformatData)
				.enter()
				.append('g')
				.attr('class', (d, i) => `${CLASS.lineChartWrapDot} ${CLASS.lineChartWrapDot}_` + (i+1));

			const dots = dotG.selectAll(`${CLASS.lineChartDot}`)
				.data(d => d)
				.enter()
				.append('circle')
				.classed(`${CLASS.lineChartDot}`, true)
				.attr('cx', d => x(d.x))
				.attr('cy', d => y(d.y))
				.attr('r', options.circleR)
				.attr('stroke-width', 1);

			const toolTpl = (idx, tpl, pos, wrap) => {
				let htmlTpl = tpl;
				const filterStr1 = htmlTpl.match(/\{\{key\}\}/g);
				const filterStr2 = htmlTpl.match(/\{\{value\}\}/g);
				const filterStr3 = htmlTpl.match(/\{\{xKey\}\}/g);
				const dataN = this.reformatData.length;
				if(filterStr3 !== null) {
					for(let j=0;j<dataN;j++) {
						htmlTpl = htmlTpl.replace(filterStr1[j], this.data[1][j]);
						htmlTpl = htmlTpl.replace(filterStr2[j], makecomma(this.reformatData[j][idx].y));
						htmlTpl = htmlTpl.replace(filterStr3[j], makecomma(this.reformatData[j][idx].x));
					}
				}else {
					for(let j=0;j<dataN;j++) {
						htmlTpl = htmlTpl.replace(filterStr1[j], this.data[1][j]);
						htmlTpl = htmlTpl.replace(filterStr2[j], makecomma(this.reformatData[j][idx].y));
					}
				}

				const tooltip = document.createElement('div');
				tooltip.classList.add(`${CLASS.tooltipClass}`);
				tooltip.innerHTML = htmlTpl;
				wrap.appendChild(tooltip);

				let toolDom = this.el.querySelector(`.${CLASS.tooltipClass}`);
				let posLeft = pos[0];
				let gap = toolDom.getBoundingClientRect().width / 3;
				if(options.mode === 'salary') {
					idx > (this.keys.length/2) ? posLeft = posLeft - (options.tooltipReverseAxisX): posLeft += (options.mLeft + options.tooltipAxisX);
				}else {
					posLeft = posLeft + gap;
				}
				let postTop = pos[1];

				toolDom.style.WebkitTransform  = 'translate(' + posLeft + 'px, ' + postTop + 'px)';
				toolDom.style.msTransform = 'translate(' + posLeft + 'px, ' + postTop + 'px)';
				toolDom.style.transform   = 'translate(' + posLeft + 'px, ' + postTop + 'px)';
			};

			const dotFocusIn = (index, wrap) => {
				d3.select(wrap).selectAll(`.${CLASS.lineChartWrapDot}`)
					.select(`.${CLASS.lineChartDot}:nth-child(${index + 1})`)
					.attr('r', options.circleR * options.circleExpand);
			};
			const dotFocusOut = wrap => {
				d3.select(wrap).selectAll(`.${CLASS.lineChartWrapDot}`)
					.selectAll(`.${CLASS.lineChartDot}`)
					.attr('r', options.circleR);
			};

			const renderTooltip = (idx, pos, wrap) => {
				if(idx === undefined && idx === null) return;
				toolTpl(idx, options.toolTip, pos, wrap);
				dotFocusIn(idx, wrap);
			};

			const hideTooltip = _ => {
				const tooltip = this.el.querySelector('.tooltip');
				tooltip.parentNode.removeChild(tooltip);
				dotFocusOut(this.el);
				focusLineHide();
			};

			if(options.focusLine) {
				const focusLine = this.g.append('g')
					.classed('focus', true)
					.append('line')
					.classed(`${CLASS.lineChartXline}`, true)
					.attr('y1', 0)
					.attr('y2', height + (options.mTop + options.mBottom))
					.style('display', 'none');
			}
			const focusLineShow = (idx) => {
				this.g.select(`.${CLASS.lineChartXline}`)
					.style('display', 'block')
					.attr('x1', dotAxis[idx])
					.attr('x2', dotAxis[idx])
					.attr('y1', 0)
					.attr('y2', height);
			};
			const focusLineHide = _ => {
				this.g.select(`.${CLASS.lineChartXline}`)
					.style('display', 'none');
			};

			const wrap_dots = d3.select(this.el)
				.select('.wrap_dot_1')
				.selectAll('.dot')
				.on('mouseover', function(d, i) {
					let posAxis = d3.mouse(this);
					let thisParentNode = wrap_dots.node().closest('div');
					if (d3.select(thisParentNode).selectAll('.tooltip')) d3.select(thisParentNode).selectAll('.tooltip').remove();
					renderTooltip(i, posAxis, thisParentNode);
					focusLineShow(i);
				})
				.on('mouseleave', () => hideTooltip());


			const dotAxis = wrap_dots.nodes().map(d => d.getAttribute('cx'));

			if(options.mode === 'salary' & options.focusData !== null) {
				const focusIdx = this.keys.indexOf(`${options.focusData}`);
				const showEvt = idx => {
					let posX = 0;
					if(idx > (this.keys.length/2)) {
						posX = parseInt(dotAxis[idx])
					}else{
						posX = parseInt(dotAxis[idx] + options.mLeft + options.tooltipAxisX);
					}
					focusLineShow(idx);
					renderTooltip(idx, [posX, 50], this.g.node().closest('div'));
				};
				showEvt(focusIdx);
			}
		}
	}

	Array.from(targetNodes).forEach(exec);

	function exec(el, i) {
		svgCheck.status === true ? new Line(el, i) : svgNotMsg(el);
	}
	return _this;
};
export default LineChart;
