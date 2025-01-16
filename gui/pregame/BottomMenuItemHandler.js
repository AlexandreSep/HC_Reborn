/**
 * This handler sets up the less important items at the bottom of the screen. Those elemnts don't contain submenus.
 */
class bottomMenuItemHandler
{
	constructor(projectInfoButtons)
	{
		let buttons = Engine.GetGUIObjectByName("bottomMenuButtons").children;

		projectInfoButtons.forEach((buttonInfo, i) => {
			let button = buttons[i];
			button.hidden = false;
			for (let propertyName in buttonInfo)
				button[propertyName] = buttonInfo[propertyName];

		});

		if (buttons.length < projectInfoButtons.length)
			error("GUI page has space for " + buttons.length + " top menu, but " + menuItems.length + " items are provided!");
	}
}