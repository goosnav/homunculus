// Reach controls the same way a player does; never click through hidden panels.
export async function revealAction(page,action){
 const button=page.locator(`[data-action="${action}"]${action==='tune'?':not([data-channel])':''}`);
 const location=await button.first().evaluate(b=>({drawer:b.closest('.tool-drawer')?.id,panel:b.closest('[data-room-panel]')?.dataset.roomPanel,play:b.dataset.play}));
 if(location.drawer){const drawer=page.locator(`#${location.drawer}`);if(!await drawer.isVisible())await page.locator(`#${location.drawer.replace('-drawer','-toggle')}`).click();}
 if(location.panel){await page.locator(`[data-room-tab="${location.panel}"]`).click();if(location.play)await page.locator('#play-select').selectOption(location.play);}
 return button;
}
export async function pressAction(page,action){await (await revealAction(page,action)).click();}
export async function showGive(page){if(!await page.locator('#service-drawer').isVisible())await page.locator('#service-toggle').click();}
