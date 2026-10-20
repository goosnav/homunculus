import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(process.env.BROWSER_TEST_URL||'http://127.0.0.1:4173');
 assert.ok(await page.locator('#message').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16),'mobile input must be at least 16px to avoid Safari focus magnification');
 assert.equal(await page.locator('#viewport').evaluate(el=>getComputedStyle(el).touchAction),'manipulation','room must allow pinch zoom');
 await page.evaluate(()=>{document.querySelector('#spawn-panel').hidden=true;document.querySelector('#message').disabled=false;});
 await page.locator('#message').focus();await page.locator('#message').fill('Can you hear me?');
 // Simulate the visual viewport becoming smaller than the layout viewport,
 // as with an on-screen keyboard. This is not a physical iPhone Safari test.
 await page.evaluate(()=>{
   Object.defineProperties(window.visualViewport,{height:{configurable:true,value:360},offsetTop:{configurable:true,value:30}});
   window.visualViewport.dispatchEvent(new Event('resize'));
 });
 await page.waitForTimeout(100);
 const box=await page.locator('#message').boundingBox();
 assert.ok(box.y>=30&&box.y+box.height<=390,'composer must remain inside the keyboard-visible viewport');
 await page.evaluate(()=>{
   Object.defineProperties(window.visualViewport,{height:{configurable:true,value:844},offsetTop:{configurable:true,value:0}});
   window.visualViewport.dispatchEvent(new Event('resize'));
 });
 await page.waitForTimeout(100);
 assert.ok((await page.locator('.window').boundingBox()).height>=840,'layout must restore after the keyboard closes');
 console.log('PASS: mobile input size, pinch zoom, keyboard viewport and restoration.');
}finally{await browser.close();}
