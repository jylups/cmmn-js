'use strict';

var assign = require('min-dash').assign;

var PaletteItems = require('./PaletteItems'),
    ITEMS = PaletteItems.ITEMS,
    GROUPS = PaletteItems.GROUPS,
    DEFAULT_FAVORITES = PaletteItems.DEFAULT_FAVORITES;

/**
 * A palette provider for CMMN 1.1 elements, in the groups of Flowable Design's
 * palette: Tasks, Containers, Sentries and Listeners open a menu of their
 * items, and a Favorites row (config palette.favorites, item ids of
 * PaletteItems) creates the most used ones directly. Flowable's task and
 * event listener types are offered when the Flowable moddle extension is loaded.
 */
function PaletteProvider(
    create,
    elementFactory,
    globalConnect,
    handTool,
    lassoTool,
    palette,
    spaceTool,
    popupMenu,
    moddle,
    config
) {

  this._popupMenu = popupMenu;
  this._moddle = moddle;
  this._config = config || {};
  this._create = create;
  this._elementFactory = elementFactory;
  this._globalConnect = globalConnect;
  this._handTool = handTool;
  this._palette = palette;
  this._lassoTool = lassoTool;
  this._spaceTool = spaceTool;

  palette.registerProvider(this);

  popupMenu.registerProvider('cmmn-palette', this);
}

module.exports = PaletteProvider;

PaletteProvider.$inject = [
  'create',
  'elementFactory',
  'globalConnect',
  'handTool',
  'lassoTool',
  'palette',
  'spaceTool',
  'popupMenu',
  'moddle',
  'config.palette'
];


PaletteProvider.prototype.getPaletteEntries = function(element) {

  var self = this;

  var actions = {},
      create = this._create,
      elementFactory = this._elementFactory,
      spaceTool = this._spaceTool,
      lassoTool = this._lassoTool,
      globalConnect = this._globalConnect,
      handTool = this._handTool;

  function createCasePlanModel(event) {
    create.start(event, elementFactory.createCasePlanModelShape());
  }

  function createCaseFileItem(event) {
    create.start(event, elementFactory.createCaseFileItemShape());
  }

  assign(actions, {
    'hand-tool': {
      group: 'tools',
      className: 'cmmn-icon-hand-tool',
      title: 'Activate the hand tool',
      action: {
        click: function(event) {
          handTool.activateHand(event);
        }
      }
    },
    'lasso-tool': {
      group: 'tools',
      className: 'cmmn-icon-lasso-tool',
      title: 'Activate the lasso tool',
      action: {
        click: function(event) {
          lassoTool.activateSelection(event);
        }
      }
    },
    'space-tool': {
      group: 'tools',
      className: 'cmmn-icon-space-tool',
      title: 'Activate the create/remove space tool',
      action: {
        click: function(event) {
          spaceTool.activateSelection(event);
        }
      }
    },
    'global-connect-tool': {
      group: 'tools',
      className: 'cmmn-icon-connection',
      title: 'Activate the global connect tool',
      action: {
        click: function(event) {
          globalConnect.toggle(event);
        }
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    }
  });

  // the groups of Flowable Design's palette, each opening a menu of its items
  GROUPS.forEach(function(group) {
    actions['create.' + group.id] = {
      group: 'create',
      className: group.className,
      title: group.label,
      action: {
        click: function(event) {
          self.openMenu(group.id, event);
        }
      }
    };
  });

  assign(actions, {
    'create.text-annotation': self._itemEntry('text-annotation', 'create'),
    'create.casePlanModel': {
      group: 'create',
      className: 'cmmn-icon-case-plan-model',
      title: 'Create CasePlanModel',
      action: {
        dragstart: createCasePlanModel,
        click: createCasePlanModel
      }
    },
    'create.caseFileItem': {
      group: 'create',
      className: 'cmmn-icon-case-file-item',
      title: 'Create Case File Item',
      action: {
        dragstart: createCaseFileItem,
        click: createCaseFileItem
      }
    }
  });

  // the Favorites row
  this._getFavorites().forEach(function(id) {
    actions['favorite.' + id] = self._itemEntry(id, 'favorites');
  });

  return actions;
};


/**
 * Whether the item can be offered: Flowable's types need the Flowable moddle.
 */
PaletteProvider.prototype._isAvailable = function(item) {
  return !!item && (!item.flowable || !!this._moddle.getPackage('flowable'));
};

PaletteProvider.prototype._getFavorites = function() {
  var self = this;

  return (this._config.favorites || DEFAULT_FAVORITES).filter(function(id) {
    return self._isAvailable(ITEMS[id]);
  });
};

/**
 * An entry that creates the item, by click or drag.
 */
PaletteProvider.prototype._itemEntry = function(id, group) {
  var item = ITEMS[id],
      create = this._create,
      elementFactory = this._elementFactory;

  function start(event) {
    create.start(event, item.create(elementFactory));
  }

  return {
    group: group,
    className: item.className,
    imageUrl: item.imageUrl,
    title: 'Create ' + item.label,
    action: {
      dragstart: start,
      click: start
    }
  };
};

/**
 * Open the menu of a group of the palette next to its button.
 *
 * @param {string} groupId
 * @param {Event} event the click on the button
 */
PaletteProvider.prototype.openMenu = function(groupId, event) {
  var target = event && (event.delegateTarget || event.target),
      rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : { right: 0, top: 0 };

  this._popupMenu.open({ id: 'palette-' + groupId, paletteGroup: groupId }, 'cmmn-palette', {
    x: rect.right + 6,
    y: rect.top
  }, {
    title: (GROUPS.filter(function(group) { return group.id === groupId; })[0] || {}).label
  });
};

/**
 * The items of a group of the palette, for the popup menu.
 */
PaletteProvider.prototype.getPopupMenuEntries = function(target) {
  var self = this,
      groupId = target && target.paletteGroup,
      entries = {};

  if (!groupId) {
    return entries;
  }

  Object.keys(ITEMS).forEach(function(id) {
    var item = ITEMS[id];

    if (item.group !== groupId || !self._isAvailable(item)) {
      return;
    }

    var entry = self._itemEntry(id, groupId);

    entries['create-' + id] = {
      label: item.label,
      className: item.className,
      imageUrl: item.imageUrl,
      action: entry.action
    };
  });

  return entries;
};
