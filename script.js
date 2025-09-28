// Card Editor JavaScript
class CardEditor {
    constructor() {
        this.canvas = document.getElementById("cardCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.objects = [];
        this.selectedObject = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentTool = "select";
        this.isDrawing = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupToolButtons();
        this.setupPropertyControls();
        this.draw();
    }

    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.canvas.addEventListener("dblclick", this.onDoubleClick.bind(this));

        // Keyboard events
        document.addEventListener("keydown", this.onKeyDown.bind(this));

        // Window resize
        window.addEventListener("resize", this.resizeCanvas.bind(this));
    }

    setupToolButtons() {
        const toolButtons = document.querySelectorAll(".tool-btn");
        toolButtons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                toolButtons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                this.currentTool = btn.dataset.tool;
                this.showToolPanel(this.currentTool);
            });
        });
    }

    showToolPanel(tool) {
        // Hide all panels
        document.getElementById("shapes-panel").classList.add("hidden");
        document.getElementById("icons-panel").classList.add("hidden");
        document.getElementById("image-panel").classList.add("hidden");

        // Show relevant panel
        if (tool === "shapes") {
            document.getElementById("shapes-panel").classList.remove("hidden");
        } else if (tool === "icons") {
            document.getElementById("icons-panel").classList.remove("hidden");
        } else if (tool === "image") {
            document.getElementById("image-panel").classList.remove("hidden");
        }
    }

    setupPropertyControls() {
        document
            .getElementById("fillColor")
            .addEventListener("change", this.updateSelectedObject.bind(this));
        document
            .getElementById("strokeColor")
            .addEventListener("change", this.updateSelectedObject.bind(this));
        document
            .getElementById("fontSize")
            .addEventListener("input", this.updateSelectedObject.bind(this));
        document
            .getElementById("fontFamily")
            .addEventListener("change", this.updateSelectedObject.bind(this));
        document
            .getElementById("fontBold")
            .addEventListener("change", this.updateSelectedObject.bind(this));
        document
            .getElementById("fontItalic")
            .addEventListener("change", this.updateSelectedObject.bind(this));
        document
            .getElementById("opacity")
            .addEventListener("input", this.updateSelectedObject.bind(this));

        // Image resize controls
        document
            .getElementById("imageWidth")
            .addEventListener("input", this.updateImageSize.bind(this));
        document
            .getElementById("imageHeight")
            .addEventListener("input", this.updateImageSize.bind(this));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    onMouseDown(e) {
        const pos = this.getMousePos(e);

        if (this.currentTool === "select") {
            this.handleSelectTool(pos, e);
        } else if (this.currentTool === "text") {
            this.addText(pos);
        }
    }

    handleSelectTool(pos, e) {
        this.selectedObject = this.getObjectAtPosition(pos);

        if (this.selectedObject) {
            this.isDragging = true;
            this.dragStart = {
                x: pos.x - this.selectedObject.x,
                y: pos.y - this.selectedObject.y,
            };
            this.updatePropertyPanel();
        } else {
            this.selectedObject = null;
        }

        this.draw();
    }

    onMouseMove(e) {
        const pos = this.getMousePos(e);

        if (this.isDragging && this.selectedObject) {
            this.selectedObject.x = pos.x - this.dragStart.x;
            this.selectedObject.y = pos.y - this.dragStart.y;
            this.draw();
        }

        // Change cursor
        const obj = this.getObjectAtPosition(pos);
        this.canvas.style.cursor = obj ? "move" : "default";
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
    }

    onDoubleClick(e) {
        const pos = this.getMousePos(e);
        const obj = this.getObjectAtPosition(pos);

        if (obj && obj.type === "text") {
            this.editText(obj);
        }
    }

    onKeyDown(e) {
        if (e.key === "Delete" && this.selectedObject) {
            this.deleteSelected();
        }
    }

    getObjectAtPosition(pos) {
        // Check objects in reverse order (top to bottom)
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (this.isPointInObject(pos, obj)) {
                return obj;
            }
        }
        return null;
    }

    isPointInObject(pos, obj) {
        switch (obj.type) {
            case "text":
            case "icon":
                return (
                    pos.x >= obj.x - 10 &&
                    pos.x <= obj.x + obj.width + 10 &&
                    pos.y >= obj.y - obj.height &&
                    pos.y <= obj.y + 10
                );

            case "rectangle":
                return (
                    pos.x >= obj.x &&
                    pos.x <= obj.x + obj.width &&
                    pos.y >= obj.y &&
                    pos.y <= obj.y + obj.height
                );

            case "circle":
                const dx = pos.x - (obj.x + obj.radius);
                const dy = pos.y - (obj.y + obj.radius);
                return dx * dx + dy * dy <= obj.radius * obj.radius;

            case "image":
                return (
                    pos.x >= obj.x &&
                    pos.x <= obj.x + obj.width &&
                    pos.y >= obj.y &&
                    pos.y <= obj.y + obj.height
                );

            default:
                return false;
        }
    }

    addText(pos) {
        const text = prompt("Enter text:") || "Sample Text";
        const textObj = {
            id: Date.now(),
            type: "text",
            text: text,
            x: pos.x,
            y: pos.y,
            fontSize: 24,
            fontFamily: "Arial",
            fillColor: "#333333",
            strokeColor: "#000000",
            opacity: 1,
            bold: false,
            italic: false,
            width: 0,
            height: 0,
        };

        // Calculate text dimensions
        this.updateTextDimensions(textObj);
        this.objects.push(textObj);
        this.selectedObject = textObj;
        this.updatePropertyPanel();
        this.draw();
    }

    updateTextDimensions(textObj) {
        this.ctx.save();
        this.ctx.font = this.getFont(textObj);
        const metrics = this.ctx.measureText(textObj.text);
        textObj.width = metrics.width;
        textObj.height = textObj.fontSize;
        this.ctx.restore();
    }

    getFont(textObj) {
        let font = "";
        if (textObj.bold) font += "bold ";
        if (textObj.italic) font += "italic ";
        font += textObj.fontSize + "px ";
        font += textObj.fontFamily;
        return font;
    }

    editText(textObj) {
        const newText = prompt("Edit text:", textObj.text);
        if (newText !== null) {
            textObj.text = newText;
            this.updateTextDimensions(textObj);
            this.draw();
        }
    }

    addShape(shapeType) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        let shapeObj = {
            id: Date.now(),
            type: shapeType,
            x: centerX - 50,
            y: centerY - 50,
            fillColor: document.getElementById("fillColor").value,
            strokeColor: document.getElementById("strokeColor").value,
            opacity: parseFloat(document.getElementById("opacity").value) / 100,
        };

        switch (shapeType) {
            case "rectangle":
                shapeObj.width = 100;
                shapeObj.height = 60;
                break;
            case "circle":
                shapeObj.radius = 50;
                break;
            case "triangle":
                shapeObj.size = 60;
                break;
            case "line":
                shapeObj.x2 = centerX + 50;
                shapeObj.y2 = centerY;
                shapeObj.width = 100;
                shapeObj.height = 3;
                break;
            case "heart":
                shapeObj.size = 50;
                break;
        }

        this.objects.push(shapeObj);
        this.selectedObject = shapeObj;
        this.updatePropertyPanel();
        this.draw();
    }

    addIcon(emoji) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const iconObj = {
            id: Date.now(),
            type: "icon",
            text: emoji,
            x: centerX,
            y: centerY,
            fontSize: 48,
            opacity: 1,
            width: 48,
            height: 48,
        };

        this.objects.push(iconObj);
        this.selectedObject = iconObj;
        this.updatePropertyPanel();
        this.draw();
    }

    updateSelectedObject() {
        if (!this.selectedObject) return;

        const fillColor = document.getElementById("fillColor").value;
        const strokeColor = document.getElementById("strokeColor").value;
        const fontSize = parseInt(document.getElementById("fontSize").value);
        const fontFamily = document.getElementById("fontFamily").value;
        const bold = document.getElementById("fontBold").checked;
        const italic = document.getElementById("fontItalic").checked;
        const opacity =
            parseFloat(document.getElementById("opacity").value) / 100;

        if (
            this.selectedObject.type === "text" ||
            this.selectedObject.type === "icon"
        ) {
            this.selectedObject.fontSize = fontSize;
            this.selectedObject.fontFamily = fontFamily;
            this.selectedObject.bold = bold;
            this.selectedObject.italic = italic;
            this.selectedObject.fillColor = fillColor;

            if (this.selectedObject.type === "text") {
                this.updateTextDimensions(this.selectedObject);
            } else {
                this.selectedObject.width = fontSize;
                this.selectedObject.height = fontSize;
            }
        } else {
            this.selectedObject.fillColor = fillColor;
            this.selectedObject.strokeColor = strokeColor;
        }

        this.selectedObject.opacity = opacity;
        this.draw();
    }

    updatePropertyPanel() {
        if (!this.selectedObject) {
            // Hide image controls when nothing is selected
            document
                .getElementById("image-resize-controls")
                .classList.add("hidden");
            return;
        }

        if (this.selectedObject.fillColor) {
            document.getElementById("fillColor").value =
                this.selectedObject.fillColor;
        }
        if (this.selectedObject.strokeColor) {
            document.getElementById("strokeColor").value =
                this.selectedObject.strokeColor;
        }
        if (this.selectedObject.fontSize) {
            document.getElementById("fontSize").value =
                this.selectedObject.fontSize;
        }
        if (this.selectedObject.fontFamily) {
            document.getElementById("fontFamily").value =
                this.selectedObject.fontFamily;
        }
        document.getElementById("fontBold").checked =
            this.selectedObject.bold || false;
        document.getElementById("fontItalic").checked =
            this.selectedObject.italic || false;
        document.getElementById("opacity").value =
            (this.selectedObject.opacity || 1) * 100;

        // Show/hide image controls based on selected object type
        const imageControls = document.getElementById("image-resize-controls");
        if (this.selectedObject.type === "image") {
            imageControls.classList.remove("hidden");
            document.getElementById("imageWidth").value =
                this.selectedObject.width || 200;
            document.getElementById("imageHeight").value =
                this.selectedObject.height || 200;
            document.getElementById("widthValue").textContent =
                (this.selectedObject.width || 200) + "px";
            document.getElementById("heightValue").textContent =
                (this.selectedObject.height || 200) + "px";
        } else {
            imageControls.classList.add("hidden");
        }
    }

    updateImageSize() {
        if (!this.selectedObject || this.selectedObject.type !== "image")
            return;

        const width = parseInt(document.getElementById("imageWidth").value);
        const height = parseInt(document.getElementById("imageHeight").value);

        this.selectedObject.width = width;
        this.selectedObject.height = height;

        // Update display values
        document.getElementById("widthValue").textContent = width + "px";
        document.getElementById("heightValue").textContent = height + "px";

        this.draw();
    }

    maintainAspectRatio() {
        if (
            !this.selectedObject ||
            this.selectedObject.type !== "image" ||
            !this.selectedObject.imageElement
        )
            return;

        const originalWidth = this.selectedObject.imageElement.width;
        const originalHeight = this.selectedObject.imageElement.height;
        const aspectRatio = originalWidth / originalHeight;

        // Get current width and adjust height accordingly
        const currentWidth = this.selectedObject.width;
        const newHeight = currentWidth / aspectRatio;

        this.selectedObject.height = newHeight;
        document.getElementById("imageHeight").value = newHeight;
        document.getElementById("heightValue").textContent =
            Math.round(newHeight) + "px";

        this.draw();
    }

    resetImageSize() {
        if (
            !this.selectedObject ||
            this.selectedObject.type !== "image" ||
            !this.selectedObject.imageElement
        )
            return;

        const originalWidth = this.selectedObject.imageElement.width;
        const originalHeight = this.selectedObject.imageElement.height;

        // Limit maximum size
        let resetWidth = Math.min(originalWidth, 300);
        let resetHeight = Math.min(originalHeight, 300);

        // Maintain aspect ratio if too large
        const aspectRatio = originalWidth / originalHeight;
        if (resetWidth / resetHeight !== aspectRatio) {
            if (originalWidth > originalHeight) {
                resetHeight = resetWidth / aspectRatio;
            } else {
                resetWidth = resetHeight * aspectRatio;
            }
        }

        this.selectedObject.width = resetWidth;
        this.selectedObject.height = resetHeight;

        document.getElementById("imageWidth").value = resetWidth;
        document.getElementById("imageHeight").value = resetHeight;
        document.getElementById("widthValue").textContent =
            Math.round(resetWidth) + "px";
        document.getElementById("heightValue").textContent =
            Math.round(resetHeight) + "px";

        this.draw();
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all objects
        this.objects.forEach((obj) => {
            this.drawObject(obj);
        });

        // Draw selection indicator
        if (this.selectedObject) {
            this.drawSelectionIndicator(this.selectedObject);
        }
    }

    drawObject(obj) {
        this.ctx.save();
        this.ctx.globalAlpha = obj.opacity || 1;

        switch (obj.type) {
            case "text":
                this.drawText(obj);
                break;
            case "rectangle":
                this.drawRectangle(obj);
                break;
            case "circle":
                this.drawCircle(obj);
                break;
            case "triangle":
                this.drawTriangle(obj);
                break;
            case "line":
                this.drawLine(obj);
                break;
            case "heart":
                this.drawHeart(obj);
                break;
            case "icon":
                this.drawIcon(obj);
                break;
            case "image":
                this.drawImage(obj);
                break;
        }

        this.ctx.restore();
    }

    drawText(obj) {
        this.ctx.font = this.getFont(obj);
        this.ctx.fillStyle = obj.fillColor || "#000000";
        this.ctx.fillText(obj.text, obj.x, obj.y);
    }

    drawRectangle(obj) {
        this.ctx.fillStyle = obj.fillColor || "#ff6b6b";
        this.ctx.strokeStyle = obj.strokeColor || "#333333";
        this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }

    drawCircle(obj) {
        this.ctx.beginPath();
        this.ctx.arc(
            obj.x + obj.radius,
            obj.y + obj.radius,
            obj.radius,
            0,
            2 * Math.PI
        );
        this.ctx.fillStyle = obj.fillColor || "#ff6b6b";
        this.ctx.fill();
        this.ctx.strokeStyle = obj.strokeColor || "#333333";
        this.ctx.stroke();
    }

    drawTriangle(obj) {
        const size = obj.size;
        this.ctx.beginPath();
        this.ctx.moveTo(obj.x + size / 2, obj.y);
        this.ctx.lineTo(obj.x, obj.y + size);
        this.ctx.lineTo(obj.x + size, obj.y + size);
        this.ctx.closePath();
        this.ctx.fillStyle = obj.fillColor || "#ff6b6b";
        this.ctx.fill();
        this.ctx.strokeStyle = obj.strokeColor || "#333333";
        this.ctx.stroke();
    }

    drawLine(obj) {
        this.ctx.beginPath();
        this.ctx.moveTo(obj.x, obj.y);
        this.ctx.lineTo(obj.x2 || obj.x + obj.width, obj.y2 || obj.y);
        this.ctx.strokeStyle = obj.strokeColor || "#333333";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }

    drawHeart(obj) {
        const size = obj.size;
        const x = obj.x;
        const y = obj.y;

        this.ctx.beginPath();
        this.ctx.moveTo(x + size / 2, y + size / 4);
        this.ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
        this.ctx.bezierCurveTo(
            x,
            y + size / 2,
            x + size / 2,
            y + (size * 3) / 4,
            x + size / 2,
            y + size
        );
        this.ctx.bezierCurveTo(
            x + size / 2,
            y + (size * 3) / 4,
            x + size,
            y + size / 2,
            x + size,
            y + size / 4
        );
        this.ctx.bezierCurveTo(
            x + size,
            y,
            x + size / 2,
            y,
            x + size / 2,
            y + size / 4
        );
        this.ctx.fillStyle = obj.fillColor || "#ff6b6b";
        this.ctx.fill();
    }

    drawIcon(obj) {
        this.ctx.font = obj.fontSize + "px Arial";
        this.ctx.fillText(
            obj.text,
            obj.x - obj.fontSize / 2,
            obj.y + obj.fontSize / 2
        );
    }

    drawImage(obj) {
        if (obj.imageElement) {
            this.ctx.drawImage(
                obj.imageElement,
                obj.x,
                obj.y,
                obj.width,
                obj.height
            );
        }
    }

    drawSelectionIndicator(obj) {
        this.ctx.save();
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = "#007bff";
        this.ctx.lineWidth = 2;

        let bounds = this.getObjectBounds(obj);
        this.ctx.strokeRect(
            bounds.x - 5,
            bounds.y - 5,
            bounds.width + 10,
            bounds.height + 10
        );

        // Draw resize handles
        this.drawResizeHandles(bounds);

        this.ctx.restore();
    }

    getObjectBounds(obj) {
        switch (obj.type) {
            case "text":
            case "icon":
                return {
                    x: obj.x - obj.width / 2,
                    y: obj.y - obj.height,
                    width: obj.width,
                    height: obj.height,
                };
            case "rectangle":
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height,
                };
            case "circle":
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.radius * 2,
                    height: obj.radius * 2,
                };
            case "triangle":
            case "heart":
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.size,
                    height: obj.size,
                };
            case "image":
                return {
                    x: obj.x,
                    y: obj.y,
                    width: obj.width,
                    height: obj.height,
                };
            default:
                return { x: 0, y: 0, width: 0, height: 0 };
        }
    }

    drawResizeHandles(bounds) {
        const handleSize = 8;
        const handles = [
            { x: bounds.x - handleSize / 2, y: bounds.y - handleSize / 2 }, // top-left
            {
                x: bounds.x + bounds.width - handleSize / 2,
                y: bounds.y - handleSize / 2,
            }, // top-right
            {
                x: bounds.x - handleSize / 2,
                y: bounds.y + bounds.height - handleSize / 2,
            }, // bottom-left
            {
                x: bounds.x + bounds.width - handleSize / 2,
                y: bounds.y + bounds.height - handleSize / 2,
            }, // bottom-right
        ];

        this.ctx.fillStyle = "#007bff";
        handles.forEach((handle) => {
            this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        });
    }

    moveToFront() {
        if (this.selectedObject) {
            const index = this.objects.indexOf(this.selectedObject);
            if (index > -1) {
                this.objects.splice(index, 1);
                this.objects.push(this.selectedObject);
                this.draw();
            }
        }
    }

    moveToBack() {
        if (this.selectedObject) {
            const index = this.objects.indexOf(this.selectedObject);
            if (index > -1) {
                this.objects.splice(index, 1);
                this.objects.unshift(this.selectedObject);
                this.draw();
            }
        }
    }

    deleteSelected() {
        if (this.selectedObject) {
            const index = this.objects.indexOf(this.selectedObject);
            if (index > -1) {
                this.objects.splice(index, 1);
                this.selectedObject = null;
                this.draw();
            }
        }
    }

    resizeCanvas() {
        // Responsive canvas sizing could be implemented here
    }

    saveCard() {
        // Create a temporary canvas for export
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;

        // Draw white background
        tempCtx.fillStyle = "#ffffff";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw all objects without selection indicators
        this.objects.forEach((obj) => {
            tempCtx.save();
            tempCtx.globalAlpha = obj.opacity || 1;
            this.drawObjectOnContext(tempCtx, obj);
            tempCtx.restore();
        });

        // Download image
        const link = document.createElement("a");
        link.download = "birthday-card.png";
        link.href = tempCanvas.toDataURL();
        link.click();
    }

    drawObjectOnContext(ctx, obj) {
        switch (obj.type) {
            case "text":
                ctx.font = this.getFont(obj);
                ctx.fillStyle = obj.fillColor || "#000000";
                ctx.fillText(obj.text, obj.x, obj.y);
                break;
            case "rectangle":
                ctx.fillStyle = obj.fillColor || "#ff6b6b";
                ctx.strokeStyle = obj.strokeColor || "#333333";
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                break;
            case "circle":
                ctx.beginPath();
                ctx.arc(
                    obj.x + obj.radius,
                    obj.y + obj.radius,
                    obj.radius,
                    0,
                    2 * Math.PI
                );
                ctx.fillStyle = obj.fillColor || "#ff6b6b";
                ctx.fill();
                ctx.strokeStyle = obj.strokeColor || "#333333";
                ctx.stroke();
                break;
            case "triangle":
                const size = obj.size;
                ctx.beginPath();
                ctx.moveTo(obj.x + size / 2, obj.y);
                ctx.lineTo(obj.x, obj.y + size);
                ctx.lineTo(obj.x + size, obj.y + size);
                ctx.closePath();
                ctx.fillStyle = obj.fillColor || "#ff6b6b";
                ctx.fill();
                ctx.strokeStyle = obj.strokeColor || "#333333";
                ctx.stroke();
                break;
            case "heart":
                const heartSize = obj.size;
                const x = obj.x;
                const y = obj.y;

                ctx.beginPath();
                ctx.moveTo(x + heartSize / 2, y + heartSize / 4);
                ctx.bezierCurveTo(
                    x + heartSize / 2,
                    y,
                    x,
                    y,
                    x,
                    y + heartSize / 4
                );
                ctx.bezierCurveTo(
                    x,
                    y + heartSize / 2,
                    x + heartSize / 2,
                    y + (heartSize * 3) / 4,
                    x + heartSize / 2,
                    y + heartSize
                );
                ctx.bezierCurveTo(
                    x + heartSize / 2,
                    y + (heartSize * 3) / 4,
                    x + heartSize,
                    y + heartSize / 2,
                    x + heartSize,
                    y + heartSize / 4
                );
                ctx.bezierCurveTo(
                    x + heartSize,
                    y,
                    x + heartSize / 2,
                    y,
                    x + heartSize / 2,
                    y + heartSize / 4
                );
                ctx.fillStyle = obj.fillColor || "#ff6b6b";
                ctx.fill();
                break;
            case "icon":
                ctx.font = obj.fontSize + "px Arial";
                ctx.fillText(
                    obj.text,
                    obj.x - obj.fontSize / 2,
                    obj.y + obj.fontSize / 2
                );
                break;
            case "image":
                if (obj.imageElement) {
                    ctx.drawImage(
                        obj.imageElement,
                        obj.x,
                        obj.y,
                        obj.width,
                        obj.height
                    );
                }
                break;
        }
    }

    newCard() {
        this.objects = [];
        this.selectedObject = null;
        this.draw();
    }

    selectTemplate(template) {
        this.newCard();

        if (template === "birthday") {
            // Add birthday template elements
            this.objects.push({
                id: Date.now(),
                type: "rectangle",
                x: 50,
                y: 50,
                width: this.canvas.width - 100,
                height: this.canvas.height - 100,
                fillColor: "#ffe6f2",
                strokeColor: "#ff69b4",
                opacity: 0.3,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "Happy Birthday!",
                x: this.canvas.width / 2 - 100,
                y: 100,
                fontSize: 36,
                fontFamily: "Arial",
                fillColor: "#ff1493",
                bold: true,
                width: 200,
                height: 36,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 2,
                type: "icon",
                text: "🎂",
                x: this.canvas.width / 2,
                y: 200,
                fontSize: 64,
                width: 64,
                height: 64,
                opacity: 1,
            });
        } else if (template === "anniversary") {
            // Add anniversary template elements
            this.objects.push({
                id: Date.now(),
                type: "heart",
                x: this.canvas.width / 2 - 40,
                y: 100,
                size: 80,
                fillColor: "#ff69b4",
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "Happy Anniversary!",
                x: this.canvas.width / 2 - 120,
                y: 250,
                fontSize: 28,
                fontFamily: "Georgia",
                fillColor: "#8b0000",
                italic: true,
                width: 240,
                height: 28,
                opacity: 1,
            });
        } else if (template === "wedding") {
            // Wedding template - elegant and romantic
            this.objects.push({
                id: Date.now(),
                type: "rectangle",
                x: 30,
                y: 30,
                width: this.canvas.width - 60,
                height: this.canvas.height - 60,
                fillColor: "#f8f6f0",
                strokeColor: "#d4af37",
                opacity: 0.9,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "Congratulations",
                x: this.canvas.width / 2 - 110,
                y: 80,
                fontSize: 32,
                fontFamily: "Georgia",
                fillColor: "#d4af37",
                italic: true,
                width: 220,
                height: 32,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 2,
                type: "text",
                text: "on your Wedding!",
                x: this.canvas.width / 2 - 100,
                y: 120,
                fontSize: 24,
                fontFamily: "Georgia",
                fillColor: "#8b4513",
                width: 200,
                height: 24,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 3,
                type: "icon",
                text: "💍",
                x: this.canvas.width / 2 - 30,
                y: 170,
                fontSize: 60,
                width: 60,
                height: 60,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 4,
                type: "icon",
                text: "💒",
                x: this.canvas.width / 2 + 30,
                y: 170,
                fontSize: 60,
                width: 60,
                height: 60,
                opacity: 1,
            });

            // Add decorative hearts
            for (let i = 0; i < 6; i++) {
                this.objects.push({
                    id: Date.now() + 5 + i,
                    type: "heart",
                    x: 60 + i * 80,
                    y: 300,
                    size: 25,
                    fillColor: "#ffb6c1",
                    opacity: 0.7,
                });
            }
        } else if (template === "graduation") {
            // Graduation template
            this.objects.push({
                id: Date.now(),
                type: "rectangle",
                x: 40,
                y: 40,
                width: this.canvas.width - 80,
                height: this.canvas.height - 80,
                fillColor: "#e6f3ff",
                strokeColor: "#0066cc",
                opacity: 0.4,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "Congratulations Graduate!",
                x: this.canvas.width / 2 - 150,
                y: 90,
                fontSize: 30,
                fontFamily: "Arial",
                fillColor: "#0066cc",
                bold: true,
                width: 300,
                height: 30,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 2,
                type: "icon",
                text: "🎓",
                x: this.canvas.width / 2,
                y: 180,
                fontSize: 80,
                width: 80,
                height: 80,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 3,
                type: "text",
                text: "You did it!",
                x: this.canvas.width / 2 - 60,
                y: 280,
                fontSize: 24,
                fontFamily: "Arial",
                fillColor: "#ff6600",
                italic: true,
                width: 120,
                height: 24,
                opacity: 1,
            });
        } else if (template === "christmas") {
            // Christmas template
            this.objects.push({
                id: Date.now(),
                type: "rectangle",
                x: 25,
                y: 25,
                width: this.canvas.width - 50,
                height: this.canvas.height - 50,
                fillColor: "#e6ffe6",
                strokeColor: "#228b22",
                opacity: 0.5,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "Merry Christmas!",
                x: this.canvas.width / 2 - 110,
                y: 80,
                fontSize: 34,
                fontFamily: "Impact",
                fillColor: "#dc143c",
                bold: true,
                width: 220,
                height: 34,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 2,
                type: "icon",
                text: "🎄",
                x: this.canvas.width / 2 - 40,
                y: 150,
                fontSize: 80,
                width: 80,
                height: 80,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 3,
                type: "icon",
                text: "🎅",
                x: this.canvas.width / 2 + 40,
                y: 150,
                fontSize: 60,
                width: 60,
                height: 60,
                opacity: 1,
            });

            // Add decorative stars
            const positions = [
                { x: 80, y: 120 },
                { x: 520, y: 120 },
                { x: 100, y: 280 },
                { x: 500, y: 280 },
            ];
            positions.forEach((pos, i) => {
                this.objects.push({
                    id: Date.now() + 4 + i,
                    type: "icon",
                    text: "⭐",
                    x: pos.x,
                    y: pos.y,
                    fontSize: 30,
                    width: 30,
                    height: 30,
                    opacity: 0.8,
                });
            });
        } else if (template === "valentine") {
            // Valentine template
            this.objects.push({
                id: Date.now(),
                type: "rectangle",
                x: 35,
                y: 35,
                width: this.canvas.width - 70,
                height: this.canvas.height - 70,
                fillColor: "#ffe0e6",
                strokeColor: "#ff1493",
                opacity: 0.6,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "Be My Valentine",
                x: this.canvas.width / 2 - 120,
                y: 90,
                fontSize: 32,
                fontFamily: "Georgia",
                fillColor: "#c71585",
                italic: true,
                bold: true,
                width: 240,
                height: 32,
                opacity: 1,
            });

            // Multiple hearts in different sizes
            const heartPositions = [
                { x: 200, y: 150, size: 60 },
                { x: 320, y: 140, size: 45 },
                { x: 150, y: 200, size: 35 },
                { x: 400, y: 180, size: 40 },
            ];

            heartPositions.forEach((pos, i) => {
                this.objects.push({
                    id: Date.now() + 2 + i,
                    type: "heart",
                    x: pos.x,
                    y: pos.y,
                    size: pos.size,
                    fillColor: i % 2 === 0 ? "#ff69b4" : "#dc143c",
                    opacity: 0.8,
                });
            });

            this.objects.push({
                id: Date.now() + 6,
                type: "icon",
                text: "💕",
                x: this.canvas.width / 2,
                y: 300,
                fontSize: 50,
                width: 50,
                height: 50,
                opacity: 1,
            });
        } else if (template === "newbaby") {
            // New Baby template
            this.objects.push({
                id: Date.now(),
                type: "rectangle",
                x: 45,
                y: 45,
                width: this.canvas.width - 90,
                height: this.canvas.height - 90,
                fillColor: "#fff5ee",
                strokeColor: "#ffa07a",
                opacity: 0.7,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "Welcome Baby!",
                x: this.canvas.width / 2 - 100,
                y: 90,
                fontSize: 30,
                fontFamily: "Arial",
                fillColor: "#ff69b4",
                bold: true,
                width: 200,
                height: 30,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 2,
                type: "icon",
                text: "👶",
                x: this.canvas.width / 2,
                y: 170,
                fontSize: 70,
                width: 70,
                height: 70,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 3,
                type: "text",
                text: "Congratulations!",
                x: this.canvas.width / 2 - 85,
                y: 270,
                fontSize: 22,
                fontFamily: "Georgia",
                fillColor: "#4169e1",
                italic: true,
                width: 170,
                height: 22,
                opacity: 1,
            });

            // Add baby-related icons
            const babyIcons = ["🍼", "🧸", "🎀"];
            babyIcons.forEach((icon, i) => {
                this.objects.push({
                    id: Date.now() + 4 + i,
                    type: "icon",
                    text: icon,
                    x: 150 + i * 100,
                    y: 320,
                    fontSize: 40,
                    width: 40,
                    height: 40,
                    opacity: 1,
                });
            });
        } else if (template === "congratulations") {
            // General congratulations template
            this.objects.push({
                id: Date.now(),
                type: "rectangle",
                x: 20,
                y: 20,
                width: this.canvas.width - 40,
                height: this.canvas.height - 40,
                fillColor: "#fff8dc",
                strokeColor: "#ffd700",
                opacity: 0.8,
            });

            this.objects.push({
                id: Date.now() + 1,
                type: "text",
                text: "CONGRATULATIONS!",
                x: this.canvas.width / 2 - 140,
                y: 80,
                fontSize: 28,
                fontFamily: "Impact",
                fillColor: "#ff8c00",
                bold: true,
                width: 280,
                height: 28,
                opacity: 1,
            });

            this.objects.push({
                id: Date.now() + 2,
                type: "icon",
                text: "🏆",
                x: this.canvas.width / 2,
                y: 160,
                fontSize: 70,
                width: 70,
                height: 70,
                opacity: 1,
            });

            // Add celebration icons
            const celebIcons = ["🎉", "🎊", "🥳"];
            celebIcons.forEach((icon, i) => {
                this.objects.push({
                    id: Date.now() + 3 + i,
                    type: "icon",
                    text: icon,
                    x: 120 + i * 120,
                    y: 280,
                    fontSize: 50,
                    width: 50,
                    height: 50,
                    opacity: 1,
                });
            });

            this.objects.push({
                id: Date.now() + 6,
                type: "text",
                text: "You're Amazing!",
                x: this.canvas.width / 2 - 90,
                y: 350,
                fontSize: 20,
                fontFamily: "Arial",
                fillColor: "#4b0082",
                italic: true,
                width: 180,
                height: 20,
                opacity: 1,
            });
        }

        this.draw();
    }

    uploadImage(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const imageObj = {
                        id: Date.now(),
                        type: "image",
                        x: 50,
                        y: 50,
                        width: Math.min(img.width, 200),
                        height: Math.min(img.height, 200),
                        imageElement: img,
                        opacity: 1,
                    };

                    // Maintain aspect ratio
                    const aspectRatio = img.width / img.height;
                    if (imageObj.width / imageObj.height !== aspectRatio) {
                        if (img.width > img.height) {
                            imageObj.height = imageObj.width / aspectRatio;
                        } else {
                            imageObj.width = imageObj.height * aspectRatio;
                        }
                    }

                    this.objects.push(imageObj);
                    this.selectedObject = imageObj;
                    this.draw();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
}

// Initialize the card editor when the page loads
let cardEditor;
document.addEventListener("DOMContentLoaded", () => {
    cardEditor = new CardEditor();
});

// Global functions for HTML event handlers
function addShape(shapeType) {
    cardEditor.addShape(shapeType);
}

function addIcon(emoji) {
    cardEditor.addIcon(emoji);
}

function uploadImage(event) {
    cardEditor.uploadImage(event);
}

function moveToFront() {
    cardEditor.moveToFront();
}

function moveToBack() {
    cardEditor.moveToBack();
}

function deleteSelected() {
    cardEditor.deleteSelected();
}

function saveCard() {
    cardEditor.saveCard();
}

function newCard() {
    cardEditor.newCard();
}

function selectTemplate(template) {
    cardEditor.selectTemplate(template);
}

function maintainAspectRatio() {
    cardEditor.maintainAspectRatio();
}

function resetImageSize() {
    cardEditor.resetImageSize();
}
