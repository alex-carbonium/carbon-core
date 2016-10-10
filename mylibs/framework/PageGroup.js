import PropertyMetadata from "./PropertyMetadata";
import Primitive from "./sync/Primitive";

class PageGroup {
    constructor(id){
        this.props = {
            id: id,
            name: "Group " + id,
            pageIds: []
        };
    }

    setProps(props){
        //var oldProps = this.props;
        this.props = Object.assign({}, this.props, props);
        //this.propsUpdated(props, oldProps);
    }

    // propsUpdated(props, oldProps){
    //     if (!window.App || !window.App.Current || !window.App.Current.isLoaded){
    //         return;
    //     }
    //     var app = App.Current;
    //     for (var propName in props){
    //         app.raiseLogEvent(Primitive.pagegroup_prop_changed(this, propName, props[propName]));
    //     }
    // }

    id(value){
        if (value !== undefined){
            this.setProps({id: value});
        }
        return this.props.id;
    }

    name(value){
        if (value !== undefined){
            this.setProps({name: value});
        }
        return this.props.name;
    }

    pageIds(value){
        if (value !== undefined){
            this.setProps({pageIds: value});
        }
        return this.props.pageIds;
    }

    removePageId(pageId){
        var pageIds = this.props.pageIds.slice();
        var index = removeElement(pageIds, pageId);
        this.setProps({pageIds: pageIds});
        return index;
    }

    insertPageId(pageId, position){
        var pageIds = (this.props.pageIds || []).slice();
        removeElement(pageIds, pageId);
        pageIds.splice(position, 0, pageId);
        this.setProps({pageIds: pageIds});
    }

    indexOfPageId(pageId){
        return this.pageIds().indexOf(pageId);
    }

    toJSON(){
        return {
            type: this.__type__,
            props: this.props
        };
    }

    fromJSON(data){
        this.setProps(data.props);
    }
}

PageGroup.prototype.__type__ = "pageGroup";

PropertyMetadata.registerForType(PageGroup, {});

//there is a circular dependency with Primitive
sketch.framework.PageGroup = PageGroup;

export default PageGroup;