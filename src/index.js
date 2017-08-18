import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import _ from 'lodash';
import classNames from 'classnames';

import { createStore } from 'redux';
import { connect } from 'react-redux';

import { ContextMenu, 
  MenuItem, ContextMenuTrigger } from 'react-contextmenu';
import 'react-virtualized/styles.css';
import { Table, Column, Grid, ScrollSync, ColumnSizer } from 'react-virtualized';
import { DragSource, DropTarget, DragDropContext } from 'react-dnd';
import ReactDnDHTML5Backend from 'react-dnd-html5-backend';

const actions = {
  reorder: (from, to) => 
    ({ type: 'REORDER', from, to }),
  resize: (columnIndex, delta) => 
    ({ type: 'RESIZE', columnIndex, delta }),
};

const reducer = (state, { type, ...rest }) => {
  switch (type) {
    case 'REORDER': {
      const { from, to } = rest;
      console.log(from, to)
      let order =_.clone(state.metadata.order);
      const column = order[from];
      order[from] = null;
      order.splice(to + (from < to), 0, column);
      order = _.filter(order);
      const newState = {
        ...state,
        metadata: {
          ...state.metadata,
          order,
        }
      };
      console.log('newState', newState);
      return newState;
    }
    case 'RESIZE': {
      const { columnIndex, delta } = rest;
      const columnKey = state.metadata.order[columnIndex];
      const width = state.metadata.header[columnKey].width;
      const newState = {
        ...state,
        metadata: {
          ...state.metadata,
          header: {
            ...state.metadata.header,
            [columnKey]: {
              width: Math.max(delta, 30),
            },
          },
        },
      };
      return newState;
    }
    default:
      return state;
  }
};

const store = createStore(reducer, {
  metadata: {
    header: {
      id: {
        width: 50,
      },
      name: {
        width: 100,
      },
      date: {
        width: 100,
      },
      type: {
        width: 100,
      },
    },
    order: [
      'id', 'name', 'date', 'type'
    ],
  },
  data: _.chain(100).range()
    .map(id => ({ 
      id, 
      name: _.uniqueId('name'), 
      date: new Date(),
      type: _.uniqueId('type')
    }))
    .value(),
});

const cellStyles = {
  display: 'flex',
  alignItems: 'center',
  // border: '1px solid black',
  boxSizing: 'border-box',
  paddingLeft: 5,
  borderTop: '1px solid #aaa',
  borderLeft: '1px solid #aaa',
};

const cellSource = {
  beginDrag: (props) => props,
};

const dndType = 'dupa';

const dropSpec = {
  drop(props, monitor) {
    store.dispatch(actions.reorder(
      monitor.getItem().columnIndex, props.columnIndex));
  }
};

class _Grip extends React.Component {
  state = { startX: 0, startY: 0, endX: 0, endY: 0 }
  constructor(...args) {
    super(...args);
  }

  onDrag = (e) => {
    this.setState({
      endX: e.clientX,
      endY: e.clientY,
    });
    this.props.onMove && 
      this.props.onMove(
        this.state.endX - this.state.startX,
        this.state.endY - this.state.startY);
  }
  onDragStart = (e) => {
    this.setState({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY,
    });
    this.props.onStart && this.props.onStart();
  }

  render() {
    return this.props.connectDragSource(
      <div style={{
          background: this.props.isDragging ? 'black' : 'transparent',
          width: 10,
          height: '100%',
          marginRight: '-5px',
          cursor: 'col-resize',
          zIndex: 1,
        }} {...this.props}
        onDrag={this.onDrag}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
      >
      </div>
    );
  }
}

const Grip = 
  DragSource('x', {
    beginDrag: (props) => props,
  }, (connect, monitor) => {
    return ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging()
    });
  })
  (
  (_Grip)
  );

class _HeaderCell extends React.Component {
  state = {
    didTriggerMenu: false,
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.menuIsActive && !nextProps.menuIsActive) {
      this.setState({ didTriggerMenu: false });
    }
  }
  render() {
    let { columnIndex, key, rowIndex, style } = this.props;
    
    let content = this.props.metadata.order[columnIndex];
    let contextTrigger;
    return this.props.connectDropTarget(this.props.connectDragSource(
      <div
        key={key}
        style={{
          ...style,
          ...cellStyles,
          background: '#e1e1e1',
          border: this.props.isOver ? '3px solid black' : 
            '1px solid #adadad'
        }}
        className={classNames('GridCell', 'GridHeader')}
       >
        <div style={{ width: '100%',  }}>
          <span>{_.toString(content)}</span>
        </div>
        <ContextMenuTrigger 
          id='dupa' ref={trigger => contextTrigger = trigger}
          attributes={{
            style: { 
              height: '100%', 
            }
          }}
        >
          <a href='#' style={{ 
              textDecoration: 'none',
              borderLeftStyle: 'solid',
              borderLeftColor: '#222',
              borderLeftWidth: 1,
              alignItems: 'center',
              height: '100%',
              width: 20,
              justifyContent: 'center',
              ...(this.props.menuIsActive && this.state.didTriggerMenu ? 
                    { display: 'flex' } : {})
            }} className={classNames('GridHeader__MenuTrigger', 'GridHeader__MenuTrigger--on')}
            onClick={e => {
              this.setState({ didTriggerMenu: true });
              contextTrigger.handleContextClick(e);
            }}
            ><span>▾</span></a>
        </ContextMenuTrigger>
        <Grip onMove={_.throttle((dx, dy) => {
            console.log('onMove', columnIndex, dx);
            const newWidth = this.state.width + dx;
            store.dispatch(actions.resize(columnIndex, newWidth))
          }, 200)}
          onStart={() => {
            this.setState({ width: this.props.metadata.header[content].width })
          }}
        />
       </div>
     ));
  }
}

const HeaderCell = 
  DragSource(dndType, cellSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }))(
    DropTarget(dndType, dropSpec, (connect, monitor) => ({
      connectDropTarget: connect.dropTarget(),
      isOver: monitor.isOver(),
    }))(_HeaderCell)
  );

class Layout_ extends React.Component {
  state = {
    menuIsActive: false,
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      !_.isEqual(prevProps.metadata, this.props.metadata) &&
      this._headerGrid && this._bodyGrid
    ) {
      this._headerGrid.recomputeGridSize();
      this._bodyGrid.recomputeGridSize();
    }
  }

  render() {
    let props = this.props;
    const styles = {
      width: '100%',
      height: '100%',
      background: 'cornsilk',
      position: 'relative',
    };
    
    function cellRenderer({ columnIndex, key, rowIndex, style }) {
      const row = props.data[rowIndex];

      return (
        <div
          key={`${key}${row.id}`}
          style={{
            ...style,
            ...cellStyles,
          }}
          className={classNames('GridCell')}
        >
          {_.toString(row[props.metadata.order[columnIndex]])}
        </div>
      )  
    }
    
    const columnWidth = ({ index }) => 
      this.props.metadata.header[this.props.metadata.order[index]].width;
    
    const columnCount = _.keys(this.props.metadata.header).length;
    const headerProps = props => Object.assign({}, props, this.props);
    return <ScrollSync>
      {
        ({
          scrollLeft,
          onScroll
        }) => {
          console.log('render', this.props)
          return <div style={styles}>
            <Grid
              ref={that => this._headerGrid = that}
              header={this.props.metadata.header}
              style={{
                overflow: 'hidden',
                background: 'white',
                zIndex: 1,
              }}
              cellRenderer={props => 
                <HeaderCell 
                  {...headerProps(props)} 
                  menuIsActive={this.state.menuIsActive} 
                />}
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={21}
              rowCount={1}
              rowHeight={21}
              width={283}
              scrollLeft={scrollLeft}
              className={classNames('')}
            />
            <Grid
              ref={that => this._bodyGrid = that}
              className={classNames('GridBody')}
              cellRenderer={cellRenderer}
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={300}
              rowCount={this.props.data.length}
              rowHeight={21}
              width={300}
              onScroll={onScroll}
            />
            <ContextMenu id="dupa" className='ContextMenu'
              onHide={() => this.setState({ menuIsActive: false })}
              onShow={() => this.setState({ menuIsActive: true })}
            >
              <MenuItem data={"some_data"} onClick={null}>
                <input type="checkbox" 
                  onClick={e => e.stopPropagation()} 
                />
                <input type="text" 
                  onClick={e => e.stopPropagation()} 
                />
              </MenuItem>
              <MenuItem data={"some_data"} onClick={null}>
                ContextMenu Item 2
              </MenuItem>
              <MenuItem divider />
              <MenuItem data={"some_data"} onClick={null}>
                ContextMenu Item 3
              </MenuItem>
            </ContextMenu>
          </div>;
        }
      }
      </ScrollSync>;
      
  }
}
const Layout = connect(_.identity, _.constant({}))(
  DragDropContext(ReactDnDHTML5Backend)(Layout_)
);

ReactDOM.render(<Layout store={store} />, 
  document.getElementById('root'));
// registerServiceWorker();
