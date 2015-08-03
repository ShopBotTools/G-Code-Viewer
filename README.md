#GCode viewer
This app generates a 3D representation of GCode.

##Functionalities
The viewer can display the paths the bit will do.

This app uses the [Gcode-To-Geometry
app](https://github.com/ShopBotTools/Handibot-GCode-To-Geometry). The GCode
commands supported are listed there.
The G0 paths are displayed by blue lines, the G1, G2 and G3 by white lines.

##Set-up
In your code you need to instantiate the class GCodeViewer.Viewer
    var viewer =  new = GCodeViewer.Viewer(container, widthCanvas, heightCanvas,
        callbackError, configuration);
The parameters are:
* **container** : domElement, the container of the viewer. **Warning**: in the
  style of the container, the position must be set as `absolute` or
  `relative`, else the position is automatically set to relative (this is
  needed for the GUI).
* **widthCanvas** : number, the width of the viewer
* **heightCanvas** : number, the width of the viewer
* **callbackError** : function, the callback function if an error occurs,
  should have one parameter: a string which will contain the error message
* **configuration** : object (optional), the configuration of the machine.
  Should be in the same format as the [Handibot Configuration
  Helper](https://github.com/ShopBotTools/Handibot-Configuration-Helper)

Then, each time you will want to see the 3D representation of the GCode: set
the GCode of your viewer object then view the paths.
    viewer.setGCode(gcode);  //gcode is a string
    viewer.viewPaths();      //refresh the display

`setGCode` will remove everything displayed in the viewer (except the helpers).
`viewPaths` displays the paths.


##Example
The code in the `index.html` is pretty straightforward and should help a lot.

##Done:
* Parsing GCode
* Display path for straight lines
* Ability to set initial position of the tool (by using the configuration helper)
* Displaying arcs
* Different coloration for G0 vs G1/G2/G3 (maybe red for G0 and blue for G1)
* Interpreting relative position mode
* Orthogonal view
* Add the possibility to load an other GCode file
* Verify that the G2 and G3 commands are possible (i.e. radius big enough)
* Show size of the total operation (v1 needs that)
* Showing difference between inches/mm (v1 needs that)
* Manage correctly each command used (v1 needs that)
* Put a button for every functionalities (v1 needs that)

##TODO:
###Functionalities
* Add a "step-by-step" functionality
* Displaying 3D representation of the result
* Animation?
### UI
* Resize base grid to match extents of cut in XY
* Auto zoom to extent of the part when loaded
* Ability to highlight based on line number to "step through" files
* Marker showing origin?
* Indicator of current tool location?
