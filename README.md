#G-Code viewer
This app generates a 3D representation of G-Code.

##Functionalities
The viewer can display the paths the bit will do and shows the total size of the
operation.

This app uses the [Gcode-To-Geometry
app](https://github.com/ShopBotTools/Handibot-GCode-To-Geometry). The G-Code
commands supported are listed there.

The G0 paths are displayed by red lines, the G1, G2 and G3 by blue lines.

It is possible to see the animation of the bit during the operation. For
convenience, it is possible to see the command currently animated by toggling
the G-Code displayer. It is also possible to click on a G-Code line command to
have the animation starting direcly from this command.

##How to use the app:
In your code you need to instantiate the class G-CodeViewer.Viewer

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
  Helper](https://github.com/ShopBotTools/Handibot-Configuration-Helper).
  If the board is set, a box representing the board will be displayed, the
  dimensions of the board are in **inches**.

Then, each time you will want to see the 3D representation of the G-Code: set
the G-Code of your viewer object then view the paths through the callback
parameter.

    viewer.setGCode(gcode, callback);  //gcode is a string

`setGCode` will display the interpretation of the G-Code.

##Example
The code in the `index.html` is pretty straightforward and should help a lot.
