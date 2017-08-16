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
import { Table, Column, Grid, ScrollSync } from 'react-virtualized';
import { DragSource, DropTarget, DragDropContext } from 'react-dnd';
import ReactDnDHTML5Backend from 'react-dnd-html5-backend';

const actions = {
  reorder(from, to) {
    return { type: 'REORDER', from, to };
  }
};

const reducer = (state, { type, from, to }) => {
  switch (type) {
    case 'REORDER': {
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
    default:
      return state;
  }
};

const store = createStore(reducer, {
  metadata: {
    header: {
      id: {},
      name: {},
      date: {},
      type: {},
    },
    order: [
      'id', 'name', 'date', 'type'
    ]
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

const moveable = Component => {
  class Moveable extends Component {
    constructor(...args) {
      super(...args);
    }
    render() {
      const props = {
        ...this.props,
        onMouseDown(e) {
          console.log('onMouseDown', e);
          // e.preventDefault();
          // e.stopPropagation();
        },
        onMouseUp(e) {
          console.log('onMouseUp', e);
        },
        onDrag(e) {
          console.log('onDrag', e)
        },
        onDragStart(e) {
          console.log('onDragStart', e)
        },
      };
      return <Component {...props} />;
    }
  };
  Moveable.displayName = `moveable(${Component.displayName || Component.name})`;
  return Moveable;
};

class _Grip extends React.Component {
  render() {
    console.log('offset', this.props.offset)
    return /* this.props.connectDragSource */(
      <div style={{
          background: 'transparent',
          width: 10,
          height: '100%',
          marginRight: '-5px',
          cursor: 'col-resize',
          zIndex: 1,
        }} {...this.props}
        onMouseDown={e => e.preventDefault()}
        onDragStart={e => console.log('onDragStart')}
        onDrag={e => console.log('onDrag')}
        >
      </div>
    );
  }
}

const Grip = moveable(_Grip);

class _HeaderCell extends React.Component {
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
          id='dupa' ref={trigger => contextTrigger = trigger}>
          <a href='#' style={{ 
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              width: 20,
              border: '1px solid #131',
              justifyContent: 'center',
            }}
            onClick={e => contextTrigger.handleContextClick(e)}
            ><span>v</span></a>
        </ContextMenuTrigger>
        <_Grip />
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
  )

class Layout_ extends React.Component {
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
    
    const columnCount = _.keys(this.props.metadata.header).length;
    const headerProps = props => Object.assign({}, props, this.props);
    return <ScrollSync>
      {
        ({
          scrollLeft,
          onScroll
        }) => {
          return <div style={styles}>
            <Grid
              style={{
                overflow: 'hidden',
                background: 'white',
              }}
              cellRenderer={props => <HeaderCell {...headerProps(props)} />}
              columnCount={columnCount}
              columnWidth={100}
              height={21}
              rowCount={1}
              rowHeight={21}
              width={283}
              scrollLeft={scrollLeft}
              className={classNames('')}
            />
            <Grid
              className={classNames('GridBody')}
              cellRenderer={cellRenderer}
              columnCount={columnCount}
              columnWidth={100}
              height={300}
              rowCount={this.props.data.length}
              rowHeight={21}
              width={300}
              onScroll={onScroll}
            />
            <ContextMenu id="dupa">
              <MenuItem data={"some_data"} onClick={null}>
                ContextMenu Item 1
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
