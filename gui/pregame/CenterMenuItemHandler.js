/**
 * This class sets up the main menu buttons, animates submenu that opens when
 * clicking on category buttons, assigns the defined actions and hotkeys to every button.
 */
class CenterMenuItemHandler
{
	constructor(menuItems)
	{
		this.menuItems = menuItems;
		this.lastTickTime = Date.now();

		this.lastOpenItem = undefined;

		this.mainMenu = Engine.GetGUIObjectByName("mainMenu");
		this.mainMenuButtons = Engine.GetGUIObjectByName("mainMenuButtons");
		this.submenu = Engine.GetGUIObjectByName("submenu");
		this.submenuButtons = Engine.GetGUIObjectByName("submenuButtons");

		this.setupMenuButtons(this.mainMenuButtons.children, this.menuItems);
		this.setupHotkeys(this.menuItems);

		Engine.GetGUIObjectByName("closeMenuButton").onPress = this.closeSubmenu.bind(this);
	}

	setupMenuButtons(buttons, menuItems)
	{
		buttons.forEach((button, i) => {
			let item = menuItems[i];
			button.hidden = !item;
			if (button.hidden)
				return;

			button.size = item.size;
			button.caption = item.caption;
			button.tooltip = item.tooltip;
			button.enabled = item.enabled === undefined || item.enabled();
			button.onPress = this.pressButton.bind(this, item, i);
			button.hidden = false;
		});

		if (buttons.length < menuItems.length)
			error("GUI page has space for " + buttons.length + " menu buttons, but " + menuItems.length + " items are provided!");
	}

	setupSubmenuButtons(buttons, menuItems)
	{
		buttons.forEach((button, i) => {
			let item = menuItems[i];
			button.hidden = !item;
			if (button.hidden)
				return;

			button.size = item.size;
			button.caption = item.caption;
			button.tooltip = item.tooltip;
			button.enabled = item.enabled === undefined || item.enabled();
			button.onPress = this.pressButton.bind(this, item, i);
			button.hidden = false;
		});

		if (buttons.length < menuItems.length)
			error("GUI page has space for " + buttons.length + " menu buttons, but " + menuItems.length + " items are provided!");
	}
	/**
	 * Expand selected submenu, or collapse if it already is expanded.
	 */
	pressButton(item, i)
	{
		if (this.submenu.hidden)
		{
			this.performButtonAction(item, i);
		}
		else
		{
			this.closeSubmenu();
			if (this.lastOpenItem && this.lastOpenItem != item)
				this.performButtonAction(item, i);
			else
				this.lastOpenItem = undefined;
		}
	}

	/**
	 * Expand submenu or perform action specified by the button object.
	 */
	performButtonAction(item, i)
	{
		this.lastOpenItem = item;

		if (item.onPress)
			item.onPress();
		else
			this.openSubmenu(i);
	}

	setupHotkeys(menuItems)
	{
		for (let i in menuItems)
		{
			let item = menuItems[i];
			if (item.onPress && item.hotkey)
				Engine.SetGlobalHotkey(item.hotkey, "Press", () => {
					this.closeSubmenu();
					item.onPress();
				});

			if (item.submenu)
				this.setupHotkeys(item.submenu);
		}
	}

	openSubmenu(i)
	{
		this.setupSubmenuButtons(this.submenuButtons.children, this.menuItems[i].submenu);

		this.submenu.size = this.menuItems[i].submenuSize;
		this.submenu.hidden = false;

		// Start animation
		this.lastTickTime = Date.now();
		this.mainMenu.onTick = this.onTick.bind(this);
	}

	closeSubmenu()
	{
		this.submenu.hidden = true;
		this.submenu.size = this.mainMenu.size;
	}

	onTick()
	{
		let now = Date.now();
		if (now == this.lastTickTime)
			return;

		let maxOffset = this.ExpansionLimiter - this.submenu.size.bottom;
		let offset = Math.min(this.MenuSpeed * (now - this.lastTickTime), maxOffset);

		this.lastTickTime = now;

		if (this.submenu.hidden || !offset)
		{
			delete this.mainMenu.onTick;
			return;
		}

		let size = this.submenu.size;
		size.top += offset;
		size.bottom += offset;
		this.submenu.size = size;
	}
}

/**
 * Collapse / expansion speed in pixels per milliseconds used when animating the button menu size.
 */
CenterMenuItemHandler.prototype.MenuSpeed = 0.1;

/**
 * CLimits the expansion of the submenu downward. Disabale to see it escape.
 */
 CenterMenuItemHandler.prototype.ExpansionLimiter = 12;
