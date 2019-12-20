import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuetify from 'vuetify/lib';
import App from '@/App.vue';

describe("Node-Link Utils", () => {
    describe("Arc Drawing", () => {
        let wrapper;

        beforeEach(()=>{
            const localVue = createLocalVue()
            localVue.use(Vuetify)

            wrapper = shallowMount(App, {
            localVue
            });
        })

        it("A straight arc returns the expected path", () => {
            // Arrange
            let link = {}
            link.source = {"x": 100, "y": 150}
            link.target = {"x": 200, "y": 250}
            console.log(wrapper.contains('#app'))

            // Act
            // let arc = wrapper.arcPath(false, link, false)
            
            // Assert
            // expect(arc).toEqual(`M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`)
        });
    });
});
