define(["ko", "./../libs/jquery.qtip", "./../libs/knockout.validation"], function(ko, qtip){
    ko.bindingHandlers["qrCode"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var options = valueAccessor();
            if (options.text){
                $(element).empty().qrcode(options);
            }
            //TODO: add disposal
        }
    };

    ko.bindingHandlers["autogrow"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            function resize(){
                $element.parent().height(element.style.height);
                element.style.height = 0;
                element.style.height = element.scrollHeight + 'px';
                $element.parent().height('auto');
            }

            var $element = $(element);
            $element.on("input", resize);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $element.off("input", resize);
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
        }
    };

    ko.bindingHandlers["clickAndSelect"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var clicked = function(){
                $(element).select();
            };

            $(element).bind("click", clicked);
            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).unbind("click", clicked);
            });

        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){

        }
    };

    ko.bindingHandlers["class"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).attr('class', value);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called once when the binding is first applied to an element,
            // and again whenever the associated observable changes value.
            // Update the DOM element based on the supplied values here.
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).attr('class', value);
        }
    };

    ko.bindingHandlers["htmlChild"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            element.appendChild(value);
        }
    };

    ko.bindingHandlers["addClass"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).addClass(value);
        }
    };
    ko.bindingHandlers["setStickerClass"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var newValue = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            var el = $(element);
            var classList = el.attr('class').split(/\s+/);
            var classString = "sticker-id-";
            $.each(classList, function(index, item){
                if (item.indexOf("sticker-id") > -1){
                    el.removeClass(item);
                }
            });
            el.addClass(classString + newValue);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var newValue = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            var el = $(element);
            var classList = el.attr('class').split(/\s+/);
            var classString = "sticker-id-";
            $.each(classList, function(index, item){
                if (item.indexOf("sticker-id") > -1){
                    el.removeClass(item);
                }
            });
            el.addClass(classString + newValue);
        }
    };
    ko.bindingHandlers["classToggle"] = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor());
            var $element = $(element);
            for (var i in value){
                var flag = value[i];
                if (flag){
                    $element.addClass(i);
                }
                else{
                    $element.removeClass(i);
                }
            }
        }
    };

    ko.bindingHandlers["src"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).attr('src', value);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called once when the binding is first applied to an element,
            // and again whenever the associated observable changes value.
            // Update the DOM element based on the supplied values here.
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).attr('src', value);
        }
    };

    ko.bindingHandlers["rows"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).attr('rows', value);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called once when the binding is first applied to an element,
            // and again whenever the associated observable changes value.
            // Update the DOM element based on the supplied values here.
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).attr('rows', value);
        }
    };

    ko.bindingHandlers["command"] = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            var clicked = function(){
                App.Current.actionManager.invoke(value);
            };
            $(element).bind("click", clicked);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).unbind("click", clicked);
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){

        }
    };
    ko.bindingHandlers.selectToUISlider = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).siblings("select").selectToUISlider({sliderOptions: value});
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
        }
    };
    ko.bindingHandlers.colorPickerSetColor = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).ColorPickerSetColor(value);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).ColorPickerSetColor(value);
        }
    };

    ko.bindingHandlers.drag = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var options = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to

            var $element = $(element);


            $element.draggable(options);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $element.draggable('destroy');
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
        }
    };

    ko.bindingHandlers.drop = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to

            $(element).droppable(value);
            //TODO: add disposal
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
        }
    };
    ko.bindingHandlers.sort = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var options = ko.utils.unwrapObservable(valueAccessor());
            var lastX, lastY;
            var helper;
            var scrollOptions = {
                when: true,
                container: options.scrollContainer
            };
            var scrollAccessor = function(){
                return scrollOptions;
            };
            options = extend({}, options, {
                mouseMove: function(e){
                    if (lastX === undefined){
                        lastX = e.pageX;
                    }
                    if (lastY === undefined){
                        lastY = e.pageY;
                    }
                    if (Math.abs(lastX - e.pageX) >= 10 || Math.abs(lastY - e.pageY) >= 10){
                        lastX = e.pageX;
                        lastY = e.pageY;
                        ko.bindingHandlers.scrollVisible.update(helper, scrollAccessor);
                    }
                },
                start: function(event, ui){
                    var o = $(this).sortable("option");
                    if (o.scrollContainer){
                        helper = ui.helper;
                        $(window).bind("mousemove", o.mouseMove);
                    }
                },
                stop: function(event, ui){
                    var o = $(this).sortable("option");
                    if (o.scrollContainer){
                        $(window).unbind("mousemove", o.mouseMove);
                    }
                    //prevent click on the dropped item
                    event.stopImmediatePropagation();
                    var res = o.updated(ko.dataFor(ui.item[0]), ko.dataFor(ui.item.parent()[0]), ui.item.index());
                    if (res === false){
                        ui.item.remove();
                    }
                }
            });
            $(element).sortable(options);
            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).sortable("destroy");
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
        }
    };

    ko.bindingHandlers.grady = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var opt = ko.utils.unwrapObservable(valueAccessor());
            opt.init(element);
            //TODO: add disposal
        }
    };

    ko.bindingHandlers.colorpicker = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var opt = ko.utils.unwrapObservable(valueAccessor());
            $(element).ColorPicker(opt);
            //TODO: add disposal
        }
    };

    ko.bindingHandlers.knob = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var opt = ko.utils.unwrapObservable(valueAccessor());
            $(element).knob(opt);
            //TODO: add disposal
        }
    };

    ko.bindingHandlers.knobSetValue = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).val(value).trigger('change');
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).val(value).trigger('change');
        }
    };

    ko.bindingHandlers.stopBinding = {
        init: function(){
            return { controlsDescendantBindings: true };
        }
    };

    ko.bindingHandlers.offset = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).offset(value);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).offset(value);
        }
    };

    ko.bindingHandlers.cm = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var options = ko.utils.unwrapObservable(valueAccessor());
            $(element).cm(options);
            //TODO: add disposal
        }
    };

    ko.bindingHandlers.tree = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var conf = ko.utils.unwrapObservable(valueAccessor());
            if (!conf || !conf.data || !conf.data.length){
                return;
            }

            var options = {
                core: {
                    animation: 50
                },
                json_data: {
                    data: conf.data
                },
                plugins: [ "json_data", "ui" ]
            };
            if (conf.options){
                for (var i in conf.options){
                    if (i === "plugins"){
                        options[i] = $.merge([], options[i]);
                        options[i] = $.merge(options[i], conf.options[i]);
                    }
                    else{
                        options[i] = $.extend({}, options[i], conf.options[i]);
                    }
                }
            }

            var $element = $(element);
            $element.hide();
            $element.jstree(options);
            $element.fadeIn(200);

            if (conf.onNodeSelected){
                $element.bind("select_node.jstree", function(event, data){
                    conf.onNodeSelected(data.rslt.obj.data("data-context"));
                });
            }

            if (conf.onNodeChecked){
                $element.bind("check_node.jstree", function(event, data){
                    if (!data.rslt.obj.hasClass("not-selectable")){
                        conf.onNodeChecked(data.rslt.obj.data("data-context"));
                    }
                });
            }
            if (conf.onNodeUnchecked){
                $element.bind("uncheck_node.jstree", function(event, data){
                    if (!data.rslt.obj.hasClass("not-selectable")){
                        conf.onNodeUnchecked(data.rslt.obj.data("data-context"));
                    }
                });
            }

            if (conf.setApi){
                var api = {
                    checkNode: function(id){
                        var node = $("#" + id);
                        $element.jstree("check_node", node);
                    },
                    uncheckNode: function(id){
                        var node = $("#" + id);
                        $element.jstree("uncheck_node", node);
                    }
                };
                conf.setApi(api);
            }
        }

        //TODO: add disposal
    };

    ko.bindingHandlers.scroll = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to

            var $element = $(element);
            $element.scrollTop(value.scrollY);
            $element.scrollLeft(value.scrollX);

            var htmlElement = $element[0];
            var onScrolled = function(){
                var newValue = {
                    scrollHeight: htmlElement.scrollHeight - htmlElement.clientHeight,
                    scrollWidth: htmlElement.scrollWidth - htmlElement.clientWidth,
                    scrollX: $element.scrollLeft(),
                    scrollY: $element.scrollTop()
                };
                var value = valueAccessor();
                value(newValue);
            };
            $element.bind("scroll", onScrolled);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).unbind("scroll", onScrolled);
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called once when the binding is first applied to an element,
            // and again whenever the associated observable changes value.
            // Update the DOM element based on the supplied values here.
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
            $(element).scrollTop(value.scrollY);
            $(element).scrollLeft(value.scrollX);
        }
    };

    var getUniqueId = function(){
        return ko.bindingHandlers.uniqueId.prefix + (++ko.bindingHandlers.uniqueId.counter)
    };

    ko.bindingHandlers.uniqueId = {
        init: function(element, valueAccessor){
            var value = valueAccessor();
            value.id = value.id || getUniqueId();

            element.id = value.id;
        },
        counter: 0,
        prefix: "ko_uniqueid_"
    };

    ko.bindingHandlers.dataAttr = {
        init: function(element, valueAccessor){
            var value = valueAccessor();
            $(element).data(value.name, value.data);
        }
    };

    ko.bindingHandlers.uniqueFor = {
        init: function(element, valueAccessor){
            var value = valueAccessor();
            value.id = value.id || getUniqueId();

            element.setAttribute("for", value.id);
        }
    };

    ko.bindingHandlers.autoBlur = {
        init: function(element, valueAccessor){
            var enabled = valueAccessor();
            var $element = $(element);

            var mouseleave = function(){
                $element.blur();
            };

            $element.bind("mouseleave", mouseleave);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $element.unbind("mouseleave", mouseleave);
            });
        }
    };

    ko.bindingHandlers.onKey = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var options = valueAccessor();
            var $element = $(element);

            var handler = function(e){
                if (e.target !== element){
                    return true;
                }
                var res = true;
                for (var i in options){
                    var keys = i.split(",");
                    each(keys, function(k){
                        if ($.ui.keyCode[k] === e.keyCode){
                            var callback = options[i];
                            callback.call(viewModel, context.$data, $element, e);
                            res = false;
                            return false;
                        }
                    });
                }
                return res;
            };

            $element.bind("keydown", handler);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $element.unbind("keydown", handler);
            });
        }
    };

    ko.bindingHandlers.uniqueNameMulti = {
        init: function(element, valueAccessor){
            element.setAttribute("name", getUniqueId() + "[]");
        }
    };

    ko.bindingHandlers.slider = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var template = valueAccessor();
            var sliderElement = $(element);
            sliderElement.slider({
                min: template.minZoom,
                max: template.maxZoom,
                step: template.step,
                value: template.value(),
                slide: function(event, ui){
                    template.value(ui.value);
                }
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            // This will be called once when the binding is first applied to an element,
            // and again whenever the associated observable changes value.
            // Update the DOM element based on the supplied values here.
            var value = ko.utils.unwrapObservable(valueAccessor()); // Get the current value of the current property we're bound to
        }
    };

    ko.bindingHandlers.toggleAnimated = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                delete context.$data.__initialized__;
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var options = ko.utils.unwrapObservable(valueAccessor());
            var $element = $(element);
            var firstTime = !context.$data.__initialized__ && !options.animateFirstTime;
            var isNative = false; //jQuery or jQuery UI

            if (options.on.condition){
                if (options.on.parameters && options.on.parameters["native"]){
                    isNative = true;
                }
                if (firstTime){
                    $element.show();
                }
                else{
                    if (isNative){
                        $element[options["on"].animation].call($element, options["on"].speed);
                    }
                    else{
                        $element.show(options["on"].animation, options["on"].parameters, options["on"].speed);
                    }
                }
            }
            else if (options.off.condition){
                if (options.off.parameters && options.off.parameters["native"]){
                    isNative = true;
                }
                if (firstTime){
                    $element.hide();
                }
                else{
                    if (isNative){
                        $element[options.off.animation].call($element, options.off.speed);
                    }
                    else{
                        $element.hide(options.off.animation, options.off.parameters, options.off.speed);
                    }
                }
            }

            if (firstTime){
                context.$data.__initialized__ = true;
            }

        }
    };
    ko.bindingHandlers.inplaceEdit = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var $element = $(element);
            var val = valueAccessor();
            var options = allBindingsAccessor().inplaceEditOptions || {};
            var template = "<input type='text' class='selectable " + options['class'] + "'/>";
            var field = $();

            var bodyClickEvent = function(e){
                if (!$(e.target).hasClass(options['class'])){
                    onEndEdit();
                }
            };
            var fieldKeyPress = function(e){
                if (e.keyCode == 13){
                    onEndEdit();
                }
            };
            var onEndEdit = function(){
                var newValue = field.val();
                $element.text(newValue).attr("title", newValue);
                options.callback.call(viewModel, newValue);

                //Unbind body click and enter click
                $("body").unbind("click", bodyClickEvent);
                field.unbind('keypress', fieldKeyPress);
                $element.bind(options.event, bindMethod);
            };

            var bindMethod = function(e){
                if (options["if"] && !options["if"]()){
                    return;
                }

                var width = $element.width();
                $element.html(template); //replace text with input
                field = $element.find("." + options['class']);

                field.width(width);
                field.val(val());
                field.select();
                e.stopPropagation(); //stop click from propagation

                $element.unbind(options.event, bindMethod);//and unbind myself
                $("body").bind("click", bodyClickEvent); //catch clicks outside input
                field.bind('keypress', fieldKeyPress); //catch enter press on field
            };

            $element.bind(options.event, bindMethod);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).unbind(options.event, bindMethod);
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var element = $(element);
            var val = valueAccessor()();
            element.text(val).attr("title", val);
        }

    };

    ko.bindingHandlers.inplaceEditBox = {
        _activate: function(element, valueAccessor){
            var $element = $(element);
            var options = $element.data("inplaceEditBox");
            var value = valueAccessor();
            var originalValue;

            var onKeyPress = function(e){
                if (e.keyCode === $.ui.keyCode.ENTER){
                    onEndEdit();
                    return false;
                }
                e.stopPropagation();
            };
            var onKeyDown = function(e){
                if (e.keyCode === $.ui.keyCode.ESCAPE){
                    onCancelled();
                    return false;
                }
                e.stopPropagation();
            };
            var onCancelled = function(){
                $element.val(originalValue).blur();
            };
            var onEndEdit = function(){
                options.observable($element.val());

                if (!options.observable.isValid || options.observable.isValid()){
                    $element
                        .removeClass("inplace-edit-active")
                        .addClass("inplace-edit-inactive")
                        .attr("readonly", "readonly")
                        .unbind('keydown', onKeyDown)
                        .unbind('keypress', onKeyPress)
                        .unbind("blur", onEndEdit)
                        .unbind("click", onClicked)
                        .blur()
                        .scrollTop(0);

                    if (value.trigger){
                        value.trigger(false);
                    }
                    options.active = false;

                    return true;
                }

                $element.focus();
                return false;
            };
            var onClicked = function(e){
                e.stopImmediatePropagation();
                return false;
            };

            options.active = true;
            $element
                .addClass("inplace-edit-active")
                .removeAttr("readonly")
                .unbind("focus")
                .removeClass("inplace-edit-inactive")
                .select()
                .bind('keydown', onKeyDown)
                .bind('keypress', onKeyPress)
                .bind("blur", onEndEdit)
                .bindFirst("click", onClicked);

            originalValue = options.observable();
        },
        _bindToEvent: function(element, valueAccessor){
            var $element = $(element);
            var options = $element.data("inplaceEditBox");

            if (!options.eventBinding){
                var onEvent = function(){
                    ko.bindingHandlers.inplaceEditBox._activate(element, valueAccessor);
                };

                $element.bind(options.event, onEvent);
                options.eventBinding = onEvent;
            }
        },
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext){
            var $element = $(element);
            var options = extend({active: false}, valueAccessor());
            var originalValue;

            $element.addClass("inplace-edit inplace-edit-inactive")
                .attr("tabIndex", "-1")
                .attr("readonly", "readonly")
                .data("inplaceEditBox", options)
                .bind("focus", function(){
                    $(this.blur());
                });

            if (options.event){
                ko.bindingHandlers.inplaceEditBox._bindToEvent(element, valueAccessor);
            }

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                if (options.eventBinding){
                    $(element).unbind(options.event, options.eventBinding);
                }
                $(element).removeData("inplaceEditBox");
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext){
            var $element = $(element);
            $element.attr("title", $element.val());

            var value = valueAccessor();
            var trigger = value.trigger && value.trigger();

            var options;
            if (trigger){
                options = $element.data("inplaceEditBox");
                if (!options.active){
                    ko.bindingHandlers.inplaceEditBox._activate(element, valueAccessor);
                }
            }

            if (value.event){
                ko.bindingHandlers.inplaceEditBox._bindToEvent(element, valueAccessor);
            }
            else{
                options = $element.data("inplaceEditBox");
                if (options.eventBinding){
                    $element.unbind(options.event, options.eventBinding);
                    delete options.eventBinding;
                }
            }
        }
    };

    ko.bindingHandlers.qtipTemplate = {
        _bind: function(element, valueAccessor, viewModel){
            var $element = $(element);
            var api = $element.qtip("api");

            if (!api){
                var template = valueAccessor();

                var holder = $("<div></div>")
                    .hide()
                    .append($("#" + template.name).html())
                    .appendTo("body");

                var options = $.extend(true, {events: {}}, template.options);
                options = $.extend(true, options, {
                    content: holder
                });

                if (options.toggleClass){
                    var originalToggle;
                    if (options.events){
                        originalToggle = options.events.toggle;
                    }
                    options.events.toggle = function(event, api){
                        $element.toggleClass(options.toggleClass, event.type === "tooltipshow");
                        if (originalToggle){
                            originalToggle(event, api);
                        }
                    };
                }

                $element.data("_holder", holder);

                ko.applyBindings(viewModel, holder[0]);

                $element.qtip(options);

                api = $element.qtip("api");
                if (options.setApi){
                    options.setApi.call(template.options, api);
                }
            }

            return api;
        },
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var $element = $(element);
            var bindQtip = function(e){
                var api;
                if (!$element.qtip("api")){
                    api = ko.bindingHandlers.qtipTemplate._bind(element, valueAccessor, context.$data);
                    api.show();
                }
                //needed for opening popup on navigation page without selecting page
                e.stopPropagation();
                return api;
            };
            $element.bind("click", bindQtip);

            var keydown = function(e){
                if (e.keyCode === $.ui.keyCode.ENTER || e.keyCode === $.ui.keyCode.SPACE){
                    bindQtip();
                }
            };
            $element.bind("keydown", keydown);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(e){
                var $e = $(e);
                var holder = $e.data("_holder");
                if (holder){
                    ko.cleanNode(holder[0]);
                }
                $e.removeData("_holder");
                $e.unbind("keydown", keydown);
                $e.unbind("click", bindQtip);

                var api = $e.qtip("api");

                //leaks in qtip
                if (api){
                    api.options.position.container.closest('html').unbind("mousedown.qtip-" + api.id);
                    delete api.cache.originalEvent;
                    delete api.cache.event;
                    delete api.cache;

                    api.destroy();
                }
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var qtipVisible = allBindingsAccessor().qtipVisible;
            if (qtipVisible){
                var api = ko.bindingHandlers.qtipTemplate._bind(element, valueAccessor, context.$data);
                if (qtipVisible()){
                    api.show();
                }
                else{
                    api.hide();
                }
            }
        }
    };

    ko.bindingHandlers.tabs = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            //var tabNodes = [];
            var tabs = valueAccessor();
            var selectedTab = allBindingsAccessor().selectedTab;
            var $element = $(element);

            function getTabById(tabId){
                var tab;
                for (var i in tabs){
                    if (tabs[i].__uniqueId__ === tabId){
                        tab = tabs[i];
                        break;
                    }
                }
                if (!tab){
                    throw "Tab not found " + tabId;
                }
                return tab;
            }

            function bindTab(tab, e){
                var template = "template: { name: '" + tab.template + "'";

                var tabModel = tab.viewModel;
                if (!tabModel && tab.lazyViewModel){
                    tabModel = tab.lazyViewModel();
                }

                if (tabModel){
                    tab.viewModel = tabModel;
                    viewModel[tab.__uniqueId__] = tabModel;
                    template += ", data: " + tab.__uniqueId__;
                }

                template += "}";

                $(e).attr("data-bind", template);

                //when used inside qtip, tabs are already bound, so removing for now
                //ko.applyBindings(viewModel, element);

                //tabNodes.push(e);
            }

            function initTab(tab){
                if (tab.viewModel && typeof tab.viewModel.init === "function"){
                    tab.viewModel.init.call(tab.viewModel);
                }
                tab.__initialized__ = true;
            }

            function selectTab(tab){
                if (tab.initOnSelect === true && !tab.__initialized__){
                    initTab(tab);
                }

                if (tab.viewModel && typeof tab.viewModel.activated === "function"){
                    tab.viewModel.activated();
                }

                sketch.framework.pubSub.publish("html.added");
            }

            $element.tabs({
                beforeActivate: function tabOptions_beforeActivate(event, ui){
                    var tabId = ui.newTab.context.hash.substr(1);
                    var tab = getTabById(tabId);

                    selectTab(tab);
                }
            });

            if (tabs){
                var index = 0;

                var $tabs = $("<ul/>");
                $element.empty();
                for (var i in tabs){
                    var uniqueId = getUniqueId();

                    tabs[i].__index__ = index++;
                    tabs[i].__uniqueId__ = uniqueId;
                    tabs[i].__panel__ = $("<div/>").attr("id", uniqueId);

                    $("<li/>").append($("<a/>").attr("href", "#" + uniqueId).text(tabs[i].title))
                        .appendTo($tabs);
                }
                $element.append($tabs);
                for (var i in tabs){
                    $element.append(tabs[i].__panel__);
                }
                $element.tabs("refresh");

                for (var i in tabs){
                    var tab = tabs[i];
                    bindTab(tab, tab.__panel__);
                    if (tab.initOnSelect !== true){
                        initTab(tab);
                    }
                }

                if (selectedTab !== undefined){
                    for (var i in tabs){
                        var tab = tabs[i];
                        if (tab === selectedTab){
                            $element.tabs("option", "active", tab.__index__);
                            break;
                        }
                    }
                }
                else{
                    $element.tabs("option", "active", 0);
                }
            }

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(e){
                $(e).tabs("destroy");
                for (var i in tabs){
                    delete tabs[i].__panel__;
                }
//                each(tabNodes, function(n){
//                    ko.cleanNode(n);
//                });
//                tabNodes = null;
            });
        }
    };

    ko.bindingHandlers.scrollTop = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            $(element).scrollTop(0);
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            $(element).scrollTop(0);
        }
    };

    ko.bindingHandlers.context = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            element.__context__ = element.getContext("2d");

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                delete element.__context__;
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var callback = ko.utils.unwrapObservable(allBindingsAccessor().contextCallback);
            callback.call(viewModel, element.__context__, element.width, element.height, context.$data, element);
        }
    };

    ko.bindingHandlers.ajaxFilePost = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var options = valueAccessor();
            $(element).ajaxfilepost(options);
            //TODO: add disposal
        }
    };

    ko.bindingHandlers.url = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var url = valueAccessor();
            var clicked = function(){
                location.href = url;
                return false;
            };
            $(element).bind("click", clicked);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                $(element).unbind("click", clicked);
            });
        }
    };

    ko.bindingHandlers.confirm = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var message = valueAccessor();

            if (message){
                var clicked = function(event){
                    var res = confirm(message);
                    if (!res){
                        event.stopImmediatePropagation();
                    }
                    return res;
                };

                $(element).bind("click", clicked);

                ko.utils.domNodeDisposal.addDisposeCallback(element, function(){
                    $(element).unbind("click", clicked);
                });
            }
        }
    };

    ko.bindingHandlers.expanded = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = valueAccessor();
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = valueAccessor();
            var $element = $(element);
            if (value()){
                $element.animate({
                        height: 'show'
                    },
                    200, function(){
                        $element.show()
                    });
            } else{
                $element.animate({
                        height: 'toggle'
                    },
                    200, function(){
                        $element.hide()
                    });
            }
        }
    };


    ko.bindingHandlers.dropkick = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            ko.utils.domNodeDisposal.addDisposeCallback(element, function(e){
                $(e).dropkick("destroy");
            });
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var options = ko.utils.unwrapObservable(valueAccessor());
            var $element = $(element);

            var opt = $.extend({}, options);
            opt = $.extend(opt, {
                startSpeed: 0,
                change: function(){
                    $element.trigger("change");
                }
            });

            $element.dropkick("destroy");
            $element.dropkick(opt);

            if (opt.attr){
                var toggle = $element.data("dropkick")["$dk"].find(".dk_toggle");
                var drop = $element.data("dropkick")["$dk"].find(".dk_options");
                for (var name in opt.attr){
                    toggle.attr(name, opt.attr[name]);
                    drop.attr(name, opt.attr[name]);
                }
            }
        }
    };
    ko.bindingHandlers.chosen = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            //TODO: add disposal
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var $element = $(element);

            var chosen = $element.chosen({
                onResultsOpened: function(){
                    sketch.framework.pubSub.publishSync("html.dropDownOpened");
                }
            });

            var options = ko.utils.unwrapObservable(valueAccessor());
            var value = options.currentValue();
            var label;
            if (options.initialLabel){
                label = options.initialLabel();
            }
            $element.trigger("liszt:select", label !== undefined ? label : value);

            if (options.attr){
                var instance = chosen.data("chzn");
                var toggle = instance.container;
                var drop = instance.dropdown;
                var searchField = instance.search_field;

                for (var name in options.attr){
                    toggle.attr(name, options.attr[name]);
                    drop.attr(name, options.attr[name]);
                    searchField.attr(name, options.attr[name]);
                }
            }
        }
    };
    ko.bindingHandlers.optionsCss = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var $element = $(element);
            var attr = ko.utils.unwrapObservable(valueAccessor());
            var options = ko.utils.unwrapObservable(allBindingsAccessor().options);
            var optionsValue = ko.utils.unwrapObservable(allBindingsAccessor().optionsValue);

            for (var i = 0, l = options.length; i < l; ++i){
                var o = options[i];
                var css = {};
                for (var a in attr){
                    css[a] = o[attr[a]];
                }

                $element.children("option[value='" + o[optionsValue] + "']").css(css);
            }
        }
    };

    ko.bindingHandlers.hideIf = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value){
                $(element).hide();
            }
        }
    };
    ko.bindingHandlers.showIf = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
        },
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value){
                $(element).show();
            }
        }
    };

    ko.bindingHandlers.controlDescendants = {
        init: function(elem, valueAccessor){
            var value = ko.utils.unwrapObservable(valueAccessor());
            return { controlsDescendantBindings: !value };
        }
    };

    ko.bindingHandlers["opacity"] = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).css("opacity", value ? 1 : 0);
        }
    };

    ko.bindingHandlers["jQuery"] = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var func = valueAccessor();
            func.call(context.$data, $(element));
        }
    };

    ko.bindingHandlers["scrollVisible"] = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var options = valueAccessor();
            var visible = ko.utils.unwrapObservable(options.when);
            if (visible){
                var $container = $(options.container);
                var $element = $(element);
                var deltaTop = $element.offset().top - $container.offset().top;
                var containerHeight = $container.outerHeight();
                var elementHeight = $element.outerHeight();
                var mustScroll = false;

                var offset = deltaTop + elementHeight - containerHeight;
                mustScroll = offset > 0;

                if (!mustScroll){
                    offset = deltaTop;
                    mustScroll = offset < 0;
                }

                if (mustScroll){
                    var newScroll = $container.scrollTop() + offset;
                    $container.scrollTop(newScroll);
                }
            }
        }
    };

    ko.bindingHandlers.valueChanged = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var value = ko.utils.unwrapObservable(valueAccessor());
            var def = $.Deferred();
            $(element).click(def.resolve);
            def.promise().done(function(){
                $(element).change(function(){
                    value(viewModel);
                });
            });
        }
    };

    ko.bindingHandlers["formatHtml"] = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, context){
            var text = valueAccessor();
            if (!text){
                return "";
            }
            var formatter = ko.bindingHandlers["formatHtml"].formatter;
            formatter.text(text);
            text = formatter.html();
            text = twttr.txt.autoLinkEntities(text, twttr.txt.extractEntitiesWithIndices(text), { targetBlank: true });
            text = text.replace(/\n/g, "<br>");
            $(element).html(text);
        },
        formatter: $("<div/>")
    };


    var special_key_map = { 'enter': 13, 'esc': 27}
    ko.bindingHandlers.shortcut = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel){
            var key = valueAccessor();
            key = key.toLowerCase();
            var match = key.match(/ctrl\+/gi);
            var ctrl_modifier = Boolean(match && match.length > 0);
            match = key.match(/alt\+/gi);
            var alt_modifier = Boolean(match && match.length > 0);
            key = key.replace(/(alt\+|ctrl\+)/gi, '');
            var keycode = null;
            if (key in special_key_map){
                keycode = special_key_map[key];
            } else{
                keycode = key.charCodeAt(0);
            }

            // if no modifiers are specified in the shortcut (.e.g shortcut is just 'n')
            // in such cases, do not trigger the shortcut if the focus is on
            // form field.
            // if modifier are specified, then even if focus is on form field
            // trigger the shortcut (e.g. ctrl+enter)
            var ignore_form_input = Boolean(ctrl_modifier || alt_modifier || key in special_key_map);

            var shortcutAction = allBindingsAccessor().shortcutAction;

            var handler = function(event){
                //first check if the element is visible. Do not trigger clicks
                // on invisible elements. This way I can add short cuts on
                // drop down menus.
                var $element = $(element);

                if ($element.is("textarea") && element !== document.activeElement){
                    return true;
                }

                var $target = $(event.target);
                var is_forminput = Boolean($target.is('button') == false && $target.is(':input') == true)
                if ($element.is(':visible') && (ignore_form_input == true || is_forminput == false)){
                    var modifier_match = ( ctrl_modifier == (event.metaKey || event.ctrlKey))
                        && ( alt_modifier == event.altKey );

                    if (modifier_match && (event.charCode == keycode || event.keyCode == keycode)){
                        event.preventDefault();
                        event.stopPropagation();
                        if (shortcutAction){
                            shortcutAction.call(viewModel, true);
                        } else{
                            $element.click();
                        }
                        // event is handled so return false so that any further propagation is stopped.
                        return false;
                    }
                }
                // event is not handled. Hence return true so that propagation continues.
                return true;
            }

            var eventname = 'keypress';
            if (key in special_key_map){
                eventname = 'keydown';
            }

            $('body').on(eventname, handler);

            var removeHandlerCallback = function(){
                $('body').off(eventname, handler);
            }

            // Now add a callback on the element so that when the element is 'disposed'
            // we can remove the event handler from the 'body'
            ko.utils.domNodeDisposal.addDisposeCallback(element, removeHandlerCallback);
        }
    };

    ko.bindingHandlers["suppress"] = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var event = ko.utils.unwrapObservable(valueAccessor());
            var handler = function(){
                return false;
            };
            $(element).on(event, handler);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                $(element).off(event, handler);
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        }
    };

    ko.observableProperty = function(property, disposalTracker){
        var propertySubscription;
        var dependencyTracker = ko.observable(0);
        var disposed = false;

        var updateDependency = function(){
            dependencyTracker(dependencyTracker() + 1);
        };

        var computed = ko.computed({
            read: function(){
                if (!disposed){
                    dependencyTracker();
                    return property.value();
                }
                return undefined;
            },
            write: function(newValue){
                if (!disposed){
                    property.value(newValue);
                }
            },
            disposeWhen: function(){
                if (!disposalTracker){
                    return false;
                }
                disposed = disposalTracker();
                if (disposed){
                    if (propertySubscription){
                        propertySubscription.dispose();
                    }
                }
                return disposed;
            }
        });

        propertySubscription = property.getChangedEvent().bind(function(event){
            updateDependency();
        });

        return computed;
    };

    ko.validation.init({
        errorElementClass: "error",
        decorateElement: true
    });
    ko.validation.rules["callback"] = {
        validator: function(val, callback){
            var that = this;
            var api = {
                error: function(msg){
                    that.message = msg;
                }
            };
            return callback(val, api);
        },
        message: ""
    };
    ko.validation.registerExtenders();
});